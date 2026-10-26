const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const test = require('node:test');

function digest(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function missing(key) {
  const error = new Error(`Missing object: ${key}`);
  error.code = 'OBJECT_NOT_FOUND';
  return error;
}

function createStore(objects = {}, { corruptOnRead = false } = {}) {
  const stored = new Map(
    Object.entries(objects).map(([key, body]) => [key, Buffer.from(body)]),
  );
  const calls = { deletes: [], gets: [], puts: [] };

  return {
    calls,
    objects: stored,
    async deletePrefix(prefix) {
      calls.deletes.push(prefix);
    },
    async get(key) {
      calls.gets.push(key);
      const body = stored.get(key);
      if (!body) throw missing(key);
      return {
        contentType: 'application/octet-stream',
        size: body.length,
        stream: Readable.from(corruptOnRead ? Buffer.from('corrupt') : body),
      };
    },
    async head(key) {
      const body = stored.get(key);
      if (!body) throw missing(key);
      return { key, size: body.length };
    },
    async list(prefix) {
      return [...stored.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, body]) => ({ key, size: body.length }));
    },
    async put(key, body) {
      calls.puts.push(key);
      const chunks = [];
      for await (const chunk of body) chunks.push(Buffer.from(chunk));
      stored.set(key, Buffer.concat(chunks));
    },
  };
}

test('copies only durable prefixes as streams and writes a completion marker last', async () => {
  const { snapshotObjects } = await import('./snapshot-objects.mjs');
  const source = createStore({
    'h5p/content/42/content.json': 'content',
    'h5p/libraries/H5P.Example-1.0/library.json': 'library',
    'h5p/temp-files/upload.bin': 'temporary',
    'media/photo.png': 'photo',
  });
  const destination = createStore();

  const snapshot = await snapshotObjects({
    destination,
    source,
    snapshotPrefix: 'snapshots/2026-10-27T00-00-00Z',
  });

  assert.deepEqual(
    snapshot.objects.map(({ key }) => key),
    [
      'h5p/content/42/content.json',
      'h5p/libraries/H5P.Example-1.0/library.json',
      'media/photo.png',
    ],
  );
  assert.deepEqual(
    snapshot.objects.map(({ sha256 }) => sha256),
    [digest('content'), digest('library'), digest('photo')],
  );
  assert.equal(destination.calls.puts.at(-1), 'snapshots/2026-10-27T00-00-00Z/complete.json');
  assert.equal(destination.calls.puts.some((key) => key.includes('temp-files')), false);
  assert.deepEqual(destination.calls.deletes, []);
});

test('fails a snapshot when destination bytes cannot be verified and never writes completion', async () => {
  const { snapshotObjects } = await import('./snapshot-objects.mjs');
  const source = createStore({ 'media/photo.png': 'photo' });
  const destination = createStore({}, { corruptOnRead: true });

  await assert.rejects(
    snapshotObjects({
      destination,
      source,
      snapshotPrefix: 'snapshots/2026-10-27T00-00-00Z',
    }),
    /checksum/i,
  );
  assert.equal(
    destination.calls.puts.includes('snapshots/2026-10-27T00-00-00Z/complete.json'),
    false,
  );
  assert.deepEqual(destination.calls.deletes, []);
});

test('keeps eight recent weekly snapshots plus six month-end snapshots and never deletes incomplete data', async () => {
  const { planRetention } = await import('./backup-policy.mjs');
  const snapshots = [
    { completed: false, prefix: 'snapshots/2025-01-01T00-00-00Z' },
    ...Array.from({ length: 7 }, (_, index) => ({
      completed: true,
      prefix: `snapshots/2025-${String(index + 1).padStart(2, '0')}-28T00-00-00Z`,
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      completed: true,
      prefix: `snapshots/2025-10-${String(index + 1).padStart(2, '0')}T00-00-00Z`,
    })),
  ];

  const plan = planRetention(snapshots, { monthEnds: 6, weekly: 8 });

  assert.equal(plan.deletePrefixes.includes('snapshots/2025-01-01T00-00-00Z'), false);
  assert.equal(plan.keepPrefixes.length, 14);
  assert.deepEqual(
    plan.deletePrefixes,
    [
      'snapshots/2025-01-28T00-00-00Z',
      'snapshots/2025-02-28T00-00-00Z',
    ],
  );
});

test('does not plan retention when snapshot copying or verification failed', async () => {
  const { planRetentionAfterVerification } = await import('./backup-policy.mjs');
  const snapshots = [{ completed: true, prefix: 'snapshots/2026-10-27T00-00-00Z' }];

  assert.throws(
    () => planRetentionAfterVerification({ snapshots, verified: false }),
    /verification/i,
  );
  assert.throws(
    () => planRetentionAfterVerification({ snapshots, snapshotSucceeded: false, verified: true }),
    /snapshot/i,
  );
});

test('verifies every object recorded in a completed snapshot manifest', async () => {
  const [{ snapshotObjects }, { verifySnapshot }] = await Promise.all([
    import('./snapshot-objects.mjs'),
    import('./verify-backup.mjs'),
  ]);
  const source = createStore({ 'media/photo.png': 'photo' });
  const destination = createStore();
  const manifest = await snapshotObjects({
    destination,
    source,
    snapshotPrefix: 'snapshots/2026-10-27T00-00-00Z',
  });

  assert.deepEqual(await verifySnapshot({ manifest, store: destination }), {
    objects: 1,
    verified: true,
  });
});
