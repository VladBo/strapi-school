const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const test = require('node:test');

async function loadResponseHelpers() {
  return import('./h5p-file-response.mjs');
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('parses open, bounded, suffix, and clamped byte ranges', async () => {
  const { parseByteRange } = await loadResponseHelpers();

  assert.equal(parseByteRange(undefined, 100), null);
  assert.deepEqual(parseByteRange('bytes=0-', 100), { start: 0, end: 99, length: 100 });
  assert.deepEqual(parseByteRange('bytes=10-19', 100), { start: 10, end: 19, length: 10 });
  assert.deepEqual(parseByteRange('bytes=-10', 100), { start: 90, end: 99, length: 10 });
  assert.deepEqual(parseByteRange('bytes=90-200', 100), { start: 90, end: 99, length: 10 });
});

test('rejects malformed, multiple, reversed, and unsatisfiable ranges', async () => {
  const { parseByteRange } = await loadResponseHelpers();

  for (const header of ['items=0-1', 'bytes=0-1,3-4', 'bytes=20-10', 'bytes=100-', 'bytes=-0']) {
    assert.throws(
      () => parseByteRange(header, 100),
      (error) => error.status === 416 && error.size === 100,
    );
  }
  assert.throws(() => parseByteRange('bytes=0-', 0), (error) => error.status === 416);
});

test('builds driver-neutral full and partial stream responses', async () => {
  const { createH5PFileResponse } = await loadResponseHelpers();
  const body = Buffer.from('0123456789');
  const getStats = async () => ({ size: body.length, birthtime: new Date(0) });
  const getStream = async () => Readable.from(body);

  const full = await createH5PFileResponse({
    filename: 'video.mp4',
    mimeType: 'video/mp4',
    getStats,
    getStream,
  });
  assert.deepEqual(
    { status: full.status, totalSize: full.totalSize, contentLength: full.contentLength, range: full.range },
    { status: 200, totalSize: 10, contentLength: 10, range: null },
  );
  assert.equal(await readStream(full.stream), '0123456789');

  const partial = await createH5PFileResponse({
    filename: 'video.mp4',
    mimeType: 'video/mp4',
    rangeHeader: 'bytes=2-5',
    getStats,
    getStream,
  });
  assert.equal(partial.status, 206);
  assert.equal(partial.mimeType, 'video/mp4');
  assert.equal(partial.contentLength, 4);
  assert.equal(partial.contentRange, 'bytes 2-5/10');
  assert.equal(await readStream(partial.stream), '2345');
});

test('applies partial and unsatisfiable range metadata to Koa responses', async () => {
  const { applyH5PFileResponse, applyRangeErrorResponse } = await loadResponseHelpers();
  const ctx = {
    headers: {},
    set(name, value) {
      this.headers[name] = value;
    },
  };
  const stream = Readable.from('2345');

  applyH5PFileResponse(ctx, {
    stream,
    mimeType: 'video/mp4',
    status: 206,
    contentLength: 4,
    contentRange: 'bytes 2-5/10',
  });

  assert.equal(ctx.status, 206);
  assert.equal(ctx.type, 'video/mp4');
  assert.equal(ctx.length, 4);
  assert.equal(ctx.headers['Accept-Ranges'], 'bytes');
  assert.equal(ctx.headers['Content-Range'], 'bytes 2-5/10');
  assert.equal(ctx.body, stream);

  const error = new Error('invalid range');
  error.status = 416;
  error.size = 10;
  assert.equal(applyRangeErrorResponse(ctx, error), true);
  assert.equal(ctx.status, 416);
  assert.equal(ctx.headers['Content-Range'], 'bytes */10');
  assert.deepEqual(ctx.body, { error: 'Range Not Satisfiable' });
  assert.equal(applyRangeErrorResponse(ctx, new Error('other')), false);
});
