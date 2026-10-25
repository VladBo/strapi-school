const { Readable } = require('node:stream');

async function bodyToBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body && typeof body[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new TypeError('The memory S3 fixture accepts Buffer or string bodies');
}

function createMissingObjectError(key) {
  const error = new Error(`Object not found: ${key}`);
  error.name = 'NoSuchKey';
  error.$metadata = { httpStatusCode: 404 };
  return error;
}

function createMemoryS3Fixture({ objects = {}, pageSize = 1000 } = {}) {
  const stored = new Map(
    Object.entries(objects).map(([key, value]) => [
      key,
      {
        body: Buffer.isBuffer(value.body ?? value)
          ? Buffer.from(value.body ?? value)
          : Buffer.from(value.body ?? value),
        contentType: value.contentType,
        etag: value.etag ?? `\"${key}\"`,
        lastModified: value.lastModified ?? new Date('2026-01-01T00:00:00.000Z'),
      },
    ]),
  );
  const commands = [];
  const uploads = [];

  const client = {
    async send(command) {
      const name = command.constructor.name;
      const input = command.input;
      commands.push({ name, input });

      if (name === 'GetObjectCommand') {
        const object = stored.get(input.Key);
        if (!object) throw createMissingObjectError(input.Key);

        const match = input.Range?.match(/^bytes=(\d+)-(\d+)$/);
        const body = match
          ? object.body.subarray(Number(match[1]), Number(match[2]) + 1)
          : object.body;
        return {
          Body: Readable.from(body),
          ContentLength: body.length,
          ContentType: object.contentType,
          ETag: object.etag,
          LastModified: object.lastModified,
        };
      }

      if (name === 'HeadObjectCommand') {
        const object = stored.get(input.Key);
        if (!object) throw createMissingObjectError(input.Key);
        return {
          ContentLength: object.body.length,
          ContentType: object.contentType,
          ETag: object.etag,
          LastModified: object.lastModified,
        };
      }

      if (name === 'ListObjectsV2Command') {
        const keys = [...stored.keys()].filter((key) => key.startsWith(input.Prefix)).sort();
        const offset = Number(input.ContinuationToken ?? 0);
        const page = keys.slice(offset, offset + pageSize);
        const nextOffset = offset + page.length;
        return {
          Contents: page.map((key) => {
            const object = stored.get(key);
            return {
              Key: key,
              Size: object.body.length,
              ETag: object.etag,
              LastModified: object.lastModified,
            };
          }),
          IsTruncated: nextOffset < keys.length,
          NextContinuationToken: nextOffset < keys.length ? String(nextOffset) : undefined,
        };
      }

      if (name === 'DeleteObjectCommand') {
        stored.delete(input.Key);
        return {};
      }

      if (name === 'DeleteObjectsCommand') {
        for (const object of input.Delete.Objects) stored.delete(object.Key);
        return {};
      }

      throw new Error(`Unsupported command in memory fixture: ${name}`);
    },
  };

  const createUpload = ({ params }) => {
    uploads.push(params);
    return {
      async done() {
        const body = await bodyToBuffer(params.Body);
        stored.set(params.Key, {
          body,
          contentType: params.ContentType,
          etag: `\"${params.Key}\"`,
          lastModified: new Date('2026-01-01T00:00:00.000Z'),
        });
        return { ETag: `\"${params.Key}\"` };
      },
    };
  };

  return { client, commands, createUpload, objects: stored, uploads };
}

module.exports = { createMemoryS3Fixture };
