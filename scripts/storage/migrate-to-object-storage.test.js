const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildMigrationPlan,
  executeMigrationPlan,
} = require('./migrate-to-object-storage.js');

const assetBaseUrl = 'https://assets.example.test';

async function writeFixture(root) {
  const files = {
    'public/uploads/photo.png': 'photo',
    'public/h5p/libraries/H5P.Example-1.0/library.json': '{"title":"Example"}',
    'public/h5p/content/42/content.json': '{"text":"Hello"}',
    'public/h5p/temp-files/staged.bin': 'temporary',
  };

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const absolutePath = path.join(root, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, contents);
    }),
  );
}

async function withFixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'object-storage-migration-'));
  try {
    await writeFixture(root);
    return await run(root);
  } finally {
    await fs.rm(root, { force: true, recursive: true });
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createStore({ failPutAt } = {}) {
  const objects = new Map();
  const calls = { deletes: [], heads: [], puts: [] };

  return {
    calls,
    objects,
    async head(key) {
      calls.heads.push(key);
      const object = objects.get(key);
      if (!object) {
        const error = new Error(`Object not found: ${key}`);
        error.code = 'OBJECT_NOT_FOUND';
        throw error;
      }
      return {
        key,
        metadata: { sha256: object.sha256 },
        size: object.body.length,
      };
    },
    async put(key, body, metadata) {
      calls.puts.push({ key, metadata });
      if (calls.puts.length === failPutAt) throw new Error(`upload interrupted at ${key}`);
      const contents = Buffer.isBuffer(body) ? body : Buffer.from(body);
      objects.set(key, { body: contents, sha256: metadata.metadata.sha256 });
    },
    async delete(key) {
      calls.deletes.push(key);
    },
  };
}

const mediaRows = [
  {
    id: 7,
    name: 'photo.png',
    provider: 'local',
    url: '/uploads/photo.png',
  },
];

test('builds a checksum-based dry-run plan without temporary H5P files', async () => {
  await withFixture(async (root) => {
    const plan = await buildMigrationPlan({ assetBaseUrl, mediaRows, root });

    assert.equal(plan.mode, 'dry-run');
    assert.deepEqual(
      plan.objects.map(({ key }) => key),
      [
        'h5p/content/42/content.json',
        'h5p/libraries/H5P.Example-1.0/library.json',
        'media/photo.png',
      ],
    );
    assert.ok(plan.objects.every((object) => object.sha256.length === 64));
    assert.ok(plan.objects.every((object) => !object.key.includes('temp-files')));
    assert.deepEqual(plan.mediaUpdates, [
      {
        id: 7,
        provider: 'aws-s3',
        url: 'https://assets.example.test/media/photo.png',
      },
    ]);
  });
});

test('defaults to dry-run and makes no writes, database updates, or deletes', async () => {
  await withFixture(async (root) => {
    const plan = await buildMigrationPlan({ assetBaseUrl, mediaRows, root });
    const store = createStore();
    const databaseUpdates = [];

    const report = await executeMigrationPlan(plan, {
      store,
      updateMedia: async (update) => databaseUpdates.push(update),
    });

    assert.equal(report.mode, 'dry-run');
    assert.equal(report.summary.planned, 3);
    assert.deepEqual(report.plan, plan.summary);
    assert.equal(store.calls.puts.length, 0);
    assert.deepEqual(databaseUpdates, []);
    assert.deepEqual(store.calls.deletes, []);
  });
});

test('skips an identical destination object and fails on a checksum conflict', async () => {
  await withFixture(async (root) => {
    const plan = await buildMigrationPlan({ assetBaseUrl, mediaRows, root });
    const identical = createStore();
    const firstObject = plan.objects[0];
    identical.objects.set(firstObject.key, {
      body: await fs.readFile(firstObject.sourcePath),
      sha256: firstObject.sha256,
    });

    const identicalReport = await executeMigrationPlan(plan, {
      apply: true,
      store: identical,
      updateMedia: async () => {},
    });
    assert.equal(identicalReport.items[0].status, 'skipped');
    assert.equal(identical.calls.puts.some(({ key }) => key === firstObject.key), false);

    const conflict = createStore();
    conflict.objects.set(firstObject.key, {
      body: Buffer.from('other'),
      sha256: hash('other'),
    });
    const conflictingReport = await executeMigrationPlan(plan, {
      apply: true,
      store: conflict,
      updateMedia: async () => assert.fail('must not update media after conflict'),
    });
    assert.equal(conflictingReport.summary.conflicts, 1);
    assert.equal(conflictingReport.summary.databaseUpdates, 0);
    assert.deepEqual(conflict.calls.deletes, []);
  });
});

test('defers every media database update until all object writes verify and resumes safely', async () => {
  await withFixture(async (root) => {
    const plan = await buildMigrationPlan({ assetBaseUrl, mediaRows, root });
    const interruptedStore = createStore({ failPutAt: 2 });
    const interruptedUpdates = [];

    const interrupted = await executeMigrationPlan(plan, {
      apply: true,
      store: interruptedStore,
      updateMedia: async (update) => interruptedUpdates.push(update),
    });
    assert.equal(interrupted.summary.errors, 1);
    assert.deepEqual(interruptedUpdates, []);
    assert.equal(interrupted.summary.databaseUpdates, 0);
    assert.deepEqual(interruptedStore.calls.deletes, []);

    const resumedStore = createStore();
    resumedStore.objects.set(
      plan.objects[0].key,
      interruptedStore.objects.get(plan.objects[0].key),
    );
    const resumedUpdates = [];
    const resumed = await executeMigrationPlan(plan, {
      apply: true,
      resumeReport: interrupted,
      store: resumedStore,
      updateMedia: async (update) => resumedUpdates.push(update),
    });
    assert.equal(resumed.summary.errors, 0);
    assert.equal(resumed.summary.skipped, 1);
    assert.deepEqual(resumedUpdates, plan.mediaUpdates);
    assert.equal(resumed.summary.databaseUpdates, 1);
    assert.deepEqual(resumedStore.calls.deletes, []);
  });
});

test('keeps the CLI dry-run by default and accepts explicit apply and resume options', async () => {
  const { isMigrationFailure, parseArguments } = await import('./migrate-to-object-storage.mjs');

  assert.deepEqual(parseArguments([]), { apply: false });
  assert.deepEqual(
    parseArguments([
      '--apply',
      '--report',
      '../migration-artifacts/2026-10-27/object-storage-migration-report.json',
      '--resume-report',
      '../migration-artifacts/previous.json',
    ]),
    {
      apply: true,
      reportPath: '../migration-artifacts/2026-10-27/object-storage-migration-report.json',
      resumeReportPath: '../migration-artifacts/previous.json',
    },
  );
  assert.throws(() => parseArguments(['--apply-retention']), /Unknown option/);
  assert.equal(isMigrationFailure({ summary: { conflicts: 1, errors: 0 } }), true);
  assert.equal(isMigrationFailure({ summary: { conflicts: 0, errors: 1 } }), true);
  assert.equal(isMigrationFailure({ summary: { conflicts: 0, errors: 0 } }), false);
});
