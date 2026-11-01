const assert = require('node:assert/strict');
const test = require('node:test');

test('isolates the bundled H5P CKEditor version guard without changing Strapi CKEditor', async () => {
  const { isolateH5PCkeditorGlobal } = await import('./h5p-ckeditor-global.mjs');
  const source = 'globalThis.CKEDITOR_VERSION = "43.3.0";';

  assert.equal(
    isolateH5PCkeditorGlobal(source),
    'globalThis.H5P_CKEDITOR_VERSION = "43.3.0";',
  );
});

test('leaves already-isolated H5P assets unchanged and rejects unexpected assets', async () => {
  const { isolateH5PCkeditorGlobal } = await import('./h5p-ckeditor-global.mjs');
  const isolated = 'globalThis.H5P_CKEDITOR_VERSION = "43.3.0";';

  assert.equal(isolateH5PCkeditorGlobal(isolated), isolated);
  assert.throws(() => isolateH5PCkeditorGlobal('window.CKEDITOR = {};'), /version guard/);
});
