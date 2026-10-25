const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const test = require('node:test');

const { createMemoryS3Fixture } = require('./memory-object-store.test-helper.js');

async function loadObjectStore() {
  return import('./object-store.mjs');
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('normalizes safe object-key parts and rejects keys that can escape their prefix', async () => {
  const { normalizeObjectKey } = await loadObjectStore();

  assert.equal(normalizeObjectKey('content', '42', 'images/picture.png'), 'content/42/images/picture.png');
  for (const unsafe of ['/absolute', '../escape', 'a\\b', '']) {
    assert.throws(() => normalizeObjectKey(unsafe), /object key/i);
  }
});

test('lists every page while keeping keys relative to the configured prefix', async () => {
  const fixture = createMemoryS3Fixture({
    pageSize: 1,
    objects: {
      'school/h5p/a.txt': 'A',
      'school/h5p/b.txt': 'BB',
      'school/media/ignored.txt': 'ignored',
    },
  });
  const { createS3ObjectStore } = await loadObjectStore();
  const store = createS3ObjectStore({ ...fixture, bucket: 'assets', prefix: 'school' });

  const listed = await store.list('h5p');

  assert.deepEqual(
    listed.map(({ key, size }) => ({ key, size })),
    [
      { key: 'h5p/a.txt', size: 1 },
      { key: 'h5p/b.txt', size: 2 },
    ],
  );
  assert.equal(fixture.commands.filter(({ name }) => name === 'ListObjectsV2Command').length, 2);
});

test('gets byte ranges as streams with object metadata', async () => {
  const fixture = createMemoryS3Fixture({
    objects: {
      'school/video.bin': {
        body: Buffer.from(Array.from({ length: 200 }, (_, index) => index)),
        contentType: 'application/octet-stream',
      },
    },
  });
  const { createS3ObjectStore } = await loadObjectStore();
  const store = createS3ObjectStore({ ...fixture, bucket: 'assets', prefix: 'school' });

  const result = await store.get('video.bin', { start: 0, end: 99 });

  assert.equal(result.key, 'video.bin');
  assert.equal(result.size, 100);
  assert.equal(result.contentType, 'application/octet-stream');
  assert.deepEqual(await readStream(result.stream), Buffer.from(Array.from({ length: 100 }, (_, index) => index)));
  const get = fixture.commands.find(({ name }) => name === 'GetObjectCommand');
  assert.equal(get.input.Range, 'bytes=0-99');
});

test('maps missing objects to false for exists while preserving the not-found error for get', async () => {
  const fixture = createMemoryS3Fixture();
  const { createS3ObjectStore } = await loadObjectStore();
  const store = createS3ObjectStore({ ...fixture, bucket: 'assets', prefix: 'school' });

  assert.equal(await store.exists('missing.json'), false);
  await assert.rejects(store.get('missing.json'), (error) => {
    assert.equal(error.code, 'OBJECT_NOT_FOUND');
    assert.equal(error.status, 404);
    assert.equal(error.key, 'missing.json');
    return true;
  });
});

test('delegates streamed writes to multipart upload with normalized metadata', async () => {
  const fixture = createMemoryS3Fixture();
  const { createS3ObjectStore } = await loadObjectStore();
  const store = createS3ObjectStore({ ...fixture, bucket: 'assets', prefix: 'school' });

  const result = await store.put('h5p/42/content.json', Readable.from('{"ok":true}'), {
    contentType: 'application/json',
    cacheControl: 'public, max-age=60',
  });

  assert.equal(result.key, 'h5p/42/content.json');
  assert.equal(fixture.uploads.length, 1);
  assert.deepEqual(
    {
      Bucket: fixture.uploads[0].Bucket,
      Key: fixture.uploads[0].Key,
      ContentType: fixture.uploads[0].ContentType,
      CacheControl: fixture.uploads[0].CacheControl,
    },
    {
      Bucket: 'assets',
      Key: 'school/h5p/42/content.json',
      ContentType: 'application/json',
      CacheControl: 'public, max-age=60',
    },
  );
});

test('deletes only the requested prefix in batches of at most 1000 objects', async () => {
  const objects = {
    'school/keep.txt': 'keep',
    'school/h5p/content/420/keep.bin': 'sibling',
  };
  for (let index = 0; index < 1005; index += 1) {
    objects[`school/h5p/content/42/${String(index).padStart(4, '0')}.bin`] = 'x';
  }
  const fixture = createMemoryS3Fixture({ objects, pageSize: 400 });
  const { createS3ObjectStore } = await loadObjectStore();
  const store = createS3ObjectStore({ ...fixture, bucket: 'assets', prefix: 'school' });

  const deleted = await store.deletePrefix('h5p/content/42');

  assert.equal(deleted, 1005);
  assert.deepEqual([...fixture.objects.keys()].sort(), [
    'school/h5p/content/420/keep.bin',
    'school/keep.txt',
  ]);
  const batches = fixture.commands
    .filter(({ name }) => name === 'DeleteObjectsCommand')
    .map(({ input }) => input.Delete.Objects.length);
  assert.deepEqual(batches, [1000, 5]);
});
