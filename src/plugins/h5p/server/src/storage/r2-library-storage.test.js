const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const test = require('node:test');

const { InstalledLibrary, LibraryName } = require('@lumieducation/h5p-server');
const { createMemoryS3Fixture } = require('./memory-object-store.test-helper.js');

async function createHarness({ objects, pageSize, cache = new Map() } = {}) {
  const [{ createS3ObjectStore }, { createR2LibraryStorage }] = await Promise.all([
    import('./object-store.mjs'),
    import('./r2-library-storage.mjs'),
  ]);
  const fixture = createMemoryS3Fixture({ objects, pageSize });
  const store = createS3ObjectStore({
    ...fixture,
    bucket: 'assets',
    prefix: 'h5p/libraries',
  });
  return {
    cache,
    fixture,
    storage: createR2LibraryStorage({ store, cache }),
  };
}

function metadata(machineName = 'H5P.Example', overrides = {}) {
  return {
    machineName,
    majorVersion: 1,
    minorVersion: 0,
    patchVersion: 0,
    title: machineName,
    runnable: 1,
    ...overrides,
  };
}

function name(machineName = 'H5P.Example', majorVersion = 1, minorVersion = 0) {
  return new LibraryName(machineName, majorVersion, minorVersion);
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('stores specification metadata separately from restricted installation metadata', async () => {
  const { fixture, storage } = await createHarness();
  const source = metadata();

  const installed = await storage.addLibrary(source, true);
  const loaded = await storage.getLibrary(name());

  assert.ok(installed instanceof InstalledLibrary);
  assert.ok(loaded instanceof InstalledLibrary);
  assert.equal(loaded.restricted, true);
  assert.equal(loaded.title, 'H5P.Example');
  assert.deepEqual(
    JSON.parse(fixture.objects.get('h5p/libraries/H5P.Example-1.0/library.json').body),
    source,
  );
  assert.deepEqual(
    JSON.parse(fixture.objects.get('h5p/libraries/H5P.Example-1.0/_storage.json').body),
    { restricted: true },
  );
});

test('updates patch metadata and additional metadata while invalidating cached reads', async () => {
  const { fixture, storage } = await createHarness();
  await storage.addLibrary(metadata(), true);
  assert.equal((await storage.getLibrary(name())).restricted, true);

  assert.equal(await storage.updateAdditionalMetadata(name(), { restricted: true }), false);
  assert.equal(await storage.updateAdditionalMetadata(name(), { restricted: false }), true);
  assert.equal((await storage.getLibrary(name())).restricted, false);

  const updated = metadata('H5P.Example', { patchVersion: 3, title: 'Updated title' });
  const result = await storage.updateLibrary({ ...updated, restricted: true });
  assert.ok(result instanceof InstalledLibrary);
  assert.equal(result.patchVersion, 3);
  assert.equal((await storage.getLibrary(name())).title, 'Updated title');
  assert.equal((await storage.getLibrary(name())).restricted, false);
  assert.deepEqual(
    JSON.parse(fixture.objects.get('h5p/libraries/H5P.Example-1.0/library.json').body),
    updated,
  );
});

test('streams library files, reports stats and languages, and hides storage internals', async () => {
  const { storage } = await createHarness();
  const library = name();
  await storage.addLibrary(metadata(), false);
  await storage.addFile(library, 'scripts/main.js', Readable.from('console.log("h5p")'));
  await storage.addFile(library, 'semantics.json', Readable.from('[{"name":"title"}]'));
  await storage.addFile(library, 'language/en.json', Readable.from('{"hello":"Hello"}'));
  await storage.addFile(library, 'language/uk.json', Readable.from('{"hello":"Привіт"}'));

  assert.equal(await storage.fileExists(library, 'scripts/main.js'), true);
  assert.equal(await storage.getFileAsString(library, 'scripts/main.js'), 'console.log("h5p")');
  assert.deepEqual(await storage.getFileAsJson(library, 'semantics.json'), [{ name: 'title' }]);
  assert.equal(await readStream(await storage.getFileStream(library, 'language/uk.json')), '{"hello":"Привіт"}');
  const stats = await storage.getFileStats(library, 'scripts/main.js');
  assert.equal(stats.size, 18);
  assert.ok(stats.birthtime instanceof Date);
  assert.deepEqual(await storage.getLanguages(library), ['en', 'uk']);
  assert.deepEqual(await storage.listFiles(library), [
    'language/en.json',
    'language/uk.json',
    'library.json',
    'scripts/main.js',
    'semantics.json',
  ]);
});

test('clears payload files without removing library or storage metadata', async () => {
  const { fixture, storage } = await createHarness();
  const library = name();
  await storage.addLibrary(metadata(), true);
  await storage.addFile(library, 'scripts/remove.js', Readable.from('remove'));

  await storage.clearFiles(library);

  assert.equal(await storage.isInstalled(library), true);
  assert.deepEqual(await storage.listFiles(library), ['library.json']);
  assert.ok(fixture.objects.has('h5p/libraries/H5P.Example-1.0/_storage.json'));
});

test('lists only installed library names across pages and supports machine-name filtering', async () => {
  const { fixture, storage } = await createHarness({ pageSize: 1 });
  await storage.addLibrary(metadata('H5P.Example', { minorVersion: 0 }), false);
  await storage.addLibrary(metadata('H5P.Example', { minorVersion: 1 }), false);
  await storage.addLibrary(metadata('H5P.Other'), false);
  fixture.objects.set('h5p/libraries/not-a-library/readme.txt', {
    body: Buffer.from('ignore'),
    lastModified: new Date('2026-01-01T00:00:00.000Z'),
  });

  assert.deepEqual(
    (await storage.getInstalledLibraryNames()).map((library) => LibraryName.toUberName(library)),
    ['H5P.Example-1.0', 'H5P.Example-1.1', 'H5P.Other-1.0'],
  );
  assert.deepEqual(
    (await storage.getInstalledLibraryNames('H5P.Example')).map((library) => LibraryName.toUberName(library)),
    ['H5P.Example-1.0', 'H5P.Example-1.1'],
  );
});

test('counts dependents while removing only editor-dependency cycles', async () => {
  const { storage } = await createHarness();
  const interactive = name('H5P.InteractiveVideo');
  const editor = name('H5PEditor.InteractiveVideo');
  await storage.addLibrary(
    metadata('H5P.InteractiveVideo', { editorDependencies: [editor] }),
    false,
  );
  await storage.addLibrary(
    metadata('H5PEditor.InteractiveVideo', { runnable: 0, preloadedDependencies: [interactive] }),
    false,
  );
  await storage.addLibrary(
    metadata('H5P.Wrapper', { preloadedDependencies: [interactive] }),
    false,
  );

  assert.deepEqual(await storage.getAllDependentsCount(), {
    'H5P.InteractiveVideo-1.0': 1,
    'H5PEditor.InteractiveVideo-1.0': 1,
  });
  assert.equal(await storage.getDependentsCount(interactive), 1);
});

test('lists addons and deletes exactly one library prefix', async () => {
  const { fixture, storage } = await createHarness();
  const addon = metadata('H5P.Addon', { addTo: { contentTypes: [{ text: { regex: '.*' } }] } });
  await storage.addLibrary(addon, false);
  await storage.addLibrary(metadata('H5P.Regular'), false);

  assert.deepEqual(
    (await storage.listAddons()).map((library) => library.machineName),
    ['H5P.Addon'],
  );
  await storage.deleteLibrary(name('H5P.Addon'));
  assert.equal(await storage.isInstalled(name('H5P.Addon')), false);
  assert.equal(await storage.isInstalled(name('H5P.Regular')), true);
  assert.ok([...fixture.objects.keys()].every((key) => !key.startsWith('h5p/libraries/H5P.Addon-1.0/')));
});

test('returns H5P-compatible errors for missing libraries, files, and unsafe paths', async () => {
  const { storage } = await createHarness();
  const library = name();

  for (const operation of [
    () => storage.getLibrary(library),
    () => storage.deleteLibrary(library),
    () => storage.getFileStream(library, 'missing.js'),
    () => storage.addFile(library, 'missing.js', Readable.from('x')),
  ]) {
    await assert.rejects(operation(), (error) => error.httpStatusCode >= 400 && Boolean(error.errorId));
  }
  await storage.addLibrary(metadata(), false);
  await assert.rejects(
    storage.addFile(library, '../escape.js', Readable.from('x')),
    (error) => error.httpStatusCode === 400,
  );
});
