import { Readable } from 'node:stream';

function rangeError(size) {
  const error = new RangeError('Requested byte range is not satisfiable');
  error.code = 'RANGE_NOT_SATISFIABLE';
  error.status = 416;
  error.size = size;
  return error;
}

export function parseByteRange(header, size) {
  if (header === undefined || header === null || header === '') return null;
  if (!Number.isSafeInteger(size) || size < 0) throw new TypeError('File size must be a non-negative integer');
  if (size === 0 || typeof header !== 'string' || header.includes(',')) throw rangeError(size);

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) throw rangeError(size);

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) throw rangeError(size);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= size ||
      end < start
    ) {
      throw rangeError(size);
    }
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1 };
}

function sliceReadable(stream, { start, end }) {
  return Readable.from(
    (async function* slice() {
      let offset = 0;
      let remaining = end - start + 1;
      for await (const rawChunk of stream) {
        if (remaining <= 0) break;
        const chunk = Buffer.from(rawChunk);
        const chunkEnd = offset + chunk.length;
        if (chunkEnd <= start) {
          offset = chunkEnd;
          continue;
        }
        const from = Math.max(0, start - offset);
        const available = chunk.subarray(from, from + remaining);
        if (available.length > 0) {
          remaining -= available.length;
          yield available;
        }
        offset = chunkEnd;
      }
    })(),
  );
}

export async function createH5PFileResponse({
  filename,
  mimeType = 'application/octet-stream',
  rangeHeader,
  getStats,
  getStream,
  getRangeStream,
}) {
  const stats = await getStats();
  const range = parseByteRange(rangeHeader, stats.size);
  const stream = range
    ? getRangeStream
      ? await getRangeStream(range.start, range.end)
      : sliceReadable(await getStream(), range)
    : await getStream();

  return {
    filename,
    stream,
    mimeType,
    totalSize: stats.size,
    contentLength: range?.length ?? stats.size,
    range,
    contentRange: range ? `bytes ${range.start}-${range.end}/${stats.size}` : undefined,
    status: range ? 206 : 200,
  };
}

export function applyH5PFileResponse(ctx, response) {
  ctx.status = response.status;
  ctx.type = response.mimeType;
  ctx.length = response.contentLength;
  ctx.set('Accept-Ranges', 'bytes');
  if (response.contentRange) ctx.set('Content-Range', response.contentRange);
  ctx.body = response.stream;
}

export function applyRangeErrorResponse(ctx, error) {
  if (error?.status !== 416) return false;
  ctx.status = 416;
  ctx.set('Accept-Ranges', 'bytes');
  ctx.set('Content-Range', `bytes */${error.size}`);
  ctx.body = { error: 'Range Not Satisfiable' };
  return true;
}
