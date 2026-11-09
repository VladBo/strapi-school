import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { rewriteUrls } = require('../../dist/src/middlewares/r2-upload-url-rewriter-core.js');

const config = {
  publicBaseUrl: 'https://assets.example.com/',
  rootPath: 'media',
};

test('rewrites upload URLs inside nested JSON objects and arrays', () => {
  const value = {
    data: [{ url: '/uploads/image.png?x=1' }],
  };

  rewriteUrls(value, config);

  assert.equal(value.data[0].url, 'https://assets.example.com/media/image.png?x=1');
});

test('ignores cyclic objects and Node streams safely', () => {
  const circular = { url: '/uploads/kept.png' };
  circular.self = circular;
  const stream = Readable.from(['body']);
  const value = { circular, stream };

  assert.doesNotThrow(() => rewriteUrls(value, config));
  assert.equal(circular.url, 'https://assets.example.com/media/kept.png');
  assert.equal(value.stream, stream);
});
