import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'node:stream';

export function normalizeObjectKey(...parts) {
  if (parts.length === 0) throw new TypeError('Object key is required');

  const key = parts
    .map((part) => {
      if (typeof part !== 'string' || part.length === 0) {
        throw new TypeError('Object key parts must be non-empty strings');
      }
      if (part.startsWith('/') || part.includes('\\') || part.includes('..')) {
        throw new TypeError(`Unsafe object key part: ${part}`);
      }
      return part;
    })
    .join('/');

  if (key.startsWith('/') || key.includes('\\') || key.includes('..')) {
    throw new TypeError(`Unsafe object key: ${key}`);
  }

  const normalized = key
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');

  if (!normalized) throw new TypeError('Object key is required');
  return normalized;
}

function isNotFound(error) {
  return (
    error?.$metadata?.httpStatusCode === 404 ||
    error?.statusCode === 404 ||
    error?.name === 'NoSuchKey' ||
    error?.name === 'NotFound' ||
    error?.Code === 'NoSuchKey'
  );
}

function createNotFoundError(key, cause) {
  const error = new Error(`Object not found: ${key}`, { cause });
  error.code = 'OBJECT_NOT_FOUND';
  error.status = 404;
  error.key = key;
  return error;
}

function asNodeReadable(body) {
  if (body instanceof Readable) return body;
  if (body && typeof body.pipe === 'function') return body;
  if (body && typeof body.transformToWebStream === 'function') {
    return Readable.fromWeb(body.transformToWebStream());
  }
  if (body && typeof body[Symbol.asyncIterator] === 'function') return Readable.from(body);
  if (body instanceof Uint8Array || typeof body === 'string') return Readable.from([body]);
  throw new TypeError('S3 returned an unsupported body type');
}

function rangeHeader(range) {
  if (range === undefined) return undefined;
  if (
    !Number.isSafeInteger(range.start) ||
    range.start < 0 ||
    (range.end !== undefined && (!Number.isSafeInteger(range.end) || range.end < range.start))
  ) {
    throw new RangeError('Object byte range must use non-negative integers with end >= start');
  }
  return `bytes=${range.start}-${range.end ?? ''}`;
}

export function createS3ObjectStore({
  client,
  createUpload = (options) => new Upload(options),
  bucket,
  prefix = '',
}) {
  if (!client || typeof client.send !== 'function') throw new TypeError('An S3 client is required');
  if (!bucket) throw new TypeError('An S3 bucket is required');

  const rootPrefix = prefix === '' ? '' : normalizeObjectKey(prefix);
  const storedKey = (key) => (rootPrefix ? `${rootPrefix}/${normalizeObjectKey(key)}` : normalizeObjectKey(key));
  const relativeKey = (key) => (rootPrefix ? key.slice(rootPrefix.length + 1) : key);

  async function put(key, body, metadata = {}) {
    const normalizedKey = normalizeObjectKey(key);
    const upload = createUpload({
      client,
      params: {
        Bucket: bucket,
        Key: storedKey(normalizedKey),
        Body: body,
        ...(metadata.contentType ? { ContentType: metadata.contentType } : {}),
        ...(metadata.cacheControl ? { CacheControl: metadata.cacheControl } : {}),
        ...(metadata.contentLength !== undefined ? { ContentLength: metadata.contentLength } : {}),
        ...(metadata.metadata ? { Metadata: metadata.metadata } : {}),
      },
    });
    const result = await upload.done();
    return { key: normalizedKey, etag: result?.ETag };
  }

  async function get(key, range) {
    const normalizedKey = normalizeObjectKey(key);
    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: storedKey(normalizedKey),
          ...(range ? { Range: rangeHeader(range) } : {}),
        }),
      );
      return {
        key: normalizedKey,
        size: result.ContentLength,
        etag: result.ETag,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        stream: asNodeReadable(result.Body),
      };
    } catch (error) {
      if (isNotFound(error)) throw createNotFoundError(normalizedKey, error);
      throw error;
    }
  }

  async function head(key) {
    const normalizedKey = normalizeObjectKey(key);
    try {
      const result = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: storedKey(normalizedKey) }),
      );
      return {
        key: normalizedKey,
        size: result.ContentLength,
        etag: result.ETag,
        contentType: result.ContentType,
        lastModified: result.LastModified,
      };
    } catch (error) {
      if (isNotFound(error)) throw createNotFoundError(normalizedKey, error);
      throw error;
    }
  }

  async function exists(key) {
    try {
      await head(key);
      return true;
    } catch (error) {
      if (error?.code === 'OBJECT_NOT_FOUND') return false;
      throw error;
    }
  }

  async function list(keyPrefix = '') {
    const normalizedPrefix = keyPrefix === '' ? '' : normalizeObjectKey(keyPrefix);
    const scopedPrefix = keyPrefix.endsWith('/') ? `${normalizedPrefix}/` : normalizedPrefix;
    const fullPrefix = rootPrefix
      ? scopedPrefix
        ? `${rootPrefix}/${scopedPrefix}`
        : rootPrefix
      : scopedPrefix;
    const objects = [];
    let continuationToken;

    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: fullPrefix,
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        }),
      );
      for (const object of result.Contents ?? []) {
        if (!object.Key) continue;
        objects.push({
          key: relativeKey(object.Key),
          size: object.Size,
          etag: object.ETag,
          lastModified: object.LastModified,
        });
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return objects;
  }

  async function deleteObject(key) {
    const normalizedKey = normalizeObjectKey(key);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storedKey(normalizedKey) }));
  }

  async function deletePrefix(keyPrefix) {
    const normalizedPrefix = normalizeObjectKey(keyPrefix);
    const directoryPrefix = `${normalizedPrefix}/`;
    const objects = await list(directoryPrefix);

    for (let offset = 0; offset < objects.length; offset += 1000) {
      const batch = objects.slice(offset, offset + 1000);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map(({ key }) => ({ Key: storedKey(key) })),
            Quiet: true,
          },
        }),
      );
    }

    return objects.length;
  }

  return { put, get, head, exists, list, delete: deleteObject, deletePrefix };
}
