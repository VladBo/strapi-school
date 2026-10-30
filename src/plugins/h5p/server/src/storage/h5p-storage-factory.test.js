const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const h5pServer = require('@lumieducation/h5p-server');

async function loadFactory() {
  return import('./h5p-storage-factory.mjs');
}

async function temporaryPaths(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'h5p-storage-factory-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    libraryPath: path.join(root, 'libraries'),
    contentPath: path.join(root, 'content'),
    temporaryPath: path.join(root, 'temp'),
  };
}

test('creates filesystem content and library storage by default', async (t) => {
  const { createH5PStorages } = await loadFactory();
  const paths = await temporaryPaths(t);

  const result = createH5PStorages({ ...paths });

  assert.equal(result.driver, 'local');
  assert.ok(result.libraryStorage instanceof h5pServer.fsImplementations.FileLibraryStorage);
  assert.ok(result.contentStorage instanceof h5pServer.fsImplementations.FileContentStorage);
  assert.ok(
    result.temporaryStorage instanceof
      h5pServer.fsImplementations.DirectoryTemporaryFileStorage,
  );
  assert.equal(result.objectStore, null);
});

test('requires complete S3 settings without silently falling back to local storage', async (t) => {
  const { createH5PStorages } = await loadFactory();
  const paths = await temporaryPaths(t);
  const complete = {
    endpoint: 'https://account.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    bucket: 'school-live',
  };

  for (const missing of Object.keys(complete)) {
    const s3 = { ...complete };
    delete s3[missing];
    assert.throws(
      () => createH5PStorages({ driver: 's3', ...paths, s3 }),
      new RegExp(missing, 'i'),
    );
  }
});

test('creates R2 adapters while keeping temporary uploads on local storage', async (t) => {
  const { createH5PStorages } = await loadFactory();
  const paths = await temporaryPaths(t);

  const result = createH5PStorages({
    driver: 's3',
    ...paths,
    s3: {
      endpoint: 'https://account.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      bucket: 'school-live',
    },
  });

  assert.equal(result.driver, 's3');
  assert.equal(typeof result.libraryStorage.getLibrary, 'function');
  assert.equal(typeof result.contentStorage.getParameters, 'function');
  assert.ok(
    result.temporaryStorage instanceof
      h5pServer.fsImplementations.DirectoryTemporaryFileStorage,
  );
  assert.equal(typeof result.objectStore.list, 'function');
});

test('rejects unknown storage drivers', async (t) => {
  const { createH5PStorages } = await loadFactory();
  const paths = await temporaryPaths(t);

  assert.throws(() => createH5PStorages({ driver: 'ftp', ...paths }), /storage driver/i);
});
