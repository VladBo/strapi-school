const assert = require('node:assert/strict');
const test = require('node:test');

test('keeps editor Ajax private while serving browser-loaded assets publicly', async () => {
  const { createEditorUrlGenerator } = await import('./h5p-url-generator.mjs');

  class FakeUrlGenerator {
    constructor(config) {
      this.base = config.baseUrl;
    }

    ajaxEndpoint = () => `${this.base}/ajax?action=`;
    coreFile = (file) => `${this.base}/core/${file}`;
    coreFiles = () => `${this.base}/core/js`;
    editorLibraryFile = (file) => `${this.base}/editor/${file}`;
    editorLibraryFiles = () => `${this.base}/editor/`;
    libraryFile = (library, file) => `${this.base}/libraries/${library.machineName}/${file}`;
    contentFilesUrl = (contentId) => `${this.base}/content/${contentId}`;
    parameters = () => `${this.base}/params`;
    play = () => `${this.base}/play`;
  }

  const generator = createEditorUrlGenerator({
    UrlGenerator: FakeUrlGenerator,
    adminConfig: { baseUrl: '/h5p' },
    publicConfig: { baseUrl: '/api/h5p' },
  });
  const library = { machineName: 'H5P.Text' };

  assert.equal(generator.ajaxEndpoint(), '/h5p/ajax?action=');
  assert.equal(generator.coreFile('h5p.js'), '/api/h5p/core/h5p.js');
  assert.equal(generator.editorLibraryFile('h5peditor.js'), '/api/h5p/editor/h5peditor.js');
  assert.equal(generator.libraryFile(library, 'library.js'), '/api/h5p/libraries/H5P.Text/library.js');
  assert.equal(generator.contentFilesUrl('42'), '/api/h5p/content/42');
  assert.equal(generator.parameters(), '/api/h5p/params');
  assert.equal(generator.play(), '/api/h5p/play');
});
