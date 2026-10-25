const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const test = require('node:test');

const { createMemoryS3Fixture } = require('./memory-object-store.test-helper.js');

async function createHarness({ objects, pageSize, createContentId } = {}) {
  const [{ createS3ObjectStore }, { createR2ContentStorage }] = await Promise.all([
    import('./object-store.mjs'),
    import('./r2-content-storage.mjs'),
  ]);
  const fixture = createMemoryS3Fixture({ objects, pageSize });
  const store = createS3ObjectStore({
    ...fixture,
    bucket: 'assets',
    prefix: 'h5p/content',
  });
  const storage = createR2ContentStorage({ store, createContentId });
  return { fixture, storage };
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const user = { id: 'editor-1', name: 'Editor' };

test('round-trips metadata and parameters with an explicit content ID', async () => {
  const { storage } = await createHarness();
  const metadata = {
    title: 'Безпечний інтернет',
    mainLibrary: 'H5P.CoursePresentation',
    preloadedDependencies: [
      { machineName: 'H5P.CoursePresentation', majorVersion: 1, minorVersion: 25 },
    ],
  };
  const parameters = { slides: [{ elements: [] }] };

  const id = await storage.addContent(metadata, parameters, user, '42');

  assert.equal(id, '42');
  assert.equal(await storage.contentExists('42'), true);
  assert.deepEqual(await storage.getMetadata('42', user), metadata);
  assert.deepEqual(await storage.getParameters('42', user), parameters);
  assert.deepEqual(await storage.listContent(user), ['42']);
});

test('rejects an explicit content ID that would create a nested prefix', async () => {
  const { storage } = await createHarness();

  await assert.rejects(
    storage.addContent({ title: 'Unsafe ID' }, {}, user, '42/nested'),
    (error) => error.httpStatusCode === 400,
  );
});

test('generates an unused unsigned 32-bit content ID and stops after five collisions', async () => {
  const candidates = ['100', '101'];
  let calls = 0;
  const { storage } = await createHarness({
    objects: { 'h5p/content/100/h5p.json': '{}' },
    createContentId: () => {
      calls += 1;
      return candidates.shift();
    },
  });

  assert.equal(await storage.addContent({ title: 'Generated' }, {}, user), '101');
  assert.equal(calls, 2);

  let collisionCalls = 0;
  const { storage: collidingStorage } = await createHarness({
    objects: { 'h5p/content/7/h5p.json': '{}' },
    createContentId: () => {
      collisionCalls += 1;
      return '7';
    },
  });
  await assert.rejects(
    collidingStorage.addContent({ title: 'Collision' }, {}, user),
    (error) => error.errorId === 'storage-file-implementations:error-generating-content-id',
  );
  assert.equal(collisionCalls, 5);
});

test('streams files and byte ranges without buffering and lists only content assets', async () => {
  const { storage } = await createHarness();
  await storage.addContent({ title: 'Video' }, {}, user, '42');
  const video = Buffer.from(Array.from({ length: 200 }, (_, index) => index));
  await storage.addFile('42', 'videos/lesson.mp4', Readable.from(video), user);

  assert.equal(await storage.fileExists('42', 'videos/lesson.mp4'), true);
  assert.deepEqual(await storage.listFiles('42', user), ['videos/lesson.mp4']);
  const stats = await storage.getFileStats('42', 'videos/lesson.mp4', user);
  assert.equal(stats.size, 200);
  assert.ok(stats.birthtime instanceof Date);
  const ranged = await storage.getFileStream('42', 'videos/lesson.mp4', user, 10, 19);
  assert.deepEqual(await readStream(ranged), video.subarray(10, 20));
});

test('counts main-library and dependency usage across content', async () => {
  const { storage } = await createHarness({ pageSize: 1 });
  const target = { machineName: 'H5P.Image', majorVersion: 1, minorVersion: 1 };
  await storage.addContent(
    { title: 'Image', mainLibrary: 'H5P.Image', preloadedDependencies: [target] },
    {},
    user,
    '1',
  );
  await storage.addContent(
    {
      title: 'Quiz',
      mainLibrary: 'H5P.QuestionSet',
      dynamicDependencies: [target],
    },
    {},
    user,
    '2',
  );
  await storage.addContent(
    {
      title: 'Different version',
      mainLibrary: 'H5P.Image',
      preloadedDependencies: [
        { machineName: 'H5P.Image', majorVersion: 1, minorVersion: 0 },
      ],
    },
    {},
    user,
    '3',
  );

  assert.deepEqual(await storage.getUsage(target), {
    asDependency: 1,
    asMainLibrary: 1,
  });
});

test('sanitizes editor filenames and rejects unsafe paths', async () => {
  const { storage } = await createHarness();

  assert.equal(storage.sanitizeFilename('images/Привіт photo?.png'), 'images/photo.png');
  await storage.addContent({ title: 'Safe files' }, {}, user, '42');
  await assert.rejects(
    storage.addFile('42', '../escape.txt', Readable.from('no'), user),
    (error) => error.httpStatusCode === 400,
  );
});

test('maps missing content and files to H5P-compatible 404 errors', async () => {
  const { storage } = await createHarness();

  assert.equal(await storage.contentExists('404'), false);
  assert.equal(await storage.fileExists('404', 'missing.bin'), false);
  for (const operation of [
    () => storage.getMetadata('404', user),
    () => storage.getFileStats('404', 'missing.bin', user),
    () => storage.deleteContent('404', user),
  ]) {
    await assert.rejects(operation(), (error) => error.httpStatusCode === 404 && Boolean(error.errorId));
  }
});

test('deletes one file or content prefix without touching sibling content', async () => {
  const { fixture, storage } = await createHarness();
  await storage.addContent({ title: 'Delete me' }, {}, user, '42');
  await storage.addContent({ title: 'Keep me' }, {}, user, '420');
  await storage.addFile('42', 'images/remove.png', Readable.from('remove'), user);
  await storage.addFile('42', 'images/keep.png', Readable.from('temporarily keep'), user);

  await storage.deleteFile('42', 'images/remove.png', user);
  assert.equal(await storage.fileExists('42', 'images/remove.png'), false);
  assert.equal(await storage.fileExists('42', 'images/keep.png'), true);

  await storage.deleteContent('42', user);
  assert.equal(await storage.contentExists('42'), false);
  assert.equal(await storage.contentExists('420'), true);
  assert.ok([...fixture.objects.keys()].every((key) => !key.startsWith('h5p/content/42/')));
});
