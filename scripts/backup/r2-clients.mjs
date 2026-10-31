import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { createS3ObjectStore } from '../../src/plugins/h5p/server/src/storage/object-store.mjs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function bufferBody(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === 'string') return Buffer.from(body);
  if (!body || typeof body[Symbol.asyncIterator] !== 'function') {
    throw new TypeError('Backup object body must be a byte stream');
  }

  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function createObjectStoreFromEnvironment(scope) {
  const client = new S3Client({
    credentials: {
      accessKeyId: required(`${scope}_ACCESS_KEY_ID`),
      secretAccessKey: required(`${scope}_SECRET_ACCESS_KEY`),
    },
    endpoint: required(`${scope}_ENDPOINT`),
    forcePathStyle: false,
    region: process.env[`${scope}_REGION`] || 'auto',
  });
  return createS3ObjectStore({
    bucket: required(`${scope}_BUCKET`),
    client,
    // Cloudflare R2 rejects managed multipart uploads and requires an explicit
    // Content-Length for streamed PUTs. These individual objects fit in memory
    // and are below the 5 GB single-PUT limit, so buffer each request and send
    // a single PUT with the exact byte length.
    createUpload: ({ client: s3Client, params }) => ({
      done: async () => {
        const body = await bufferBody(params.Body);
        return s3Client.send(
          new PutObjectCommand({ ...params, Body: body, ContentLength: body.byteLength }),
        );
      },
    }),
  });
}
