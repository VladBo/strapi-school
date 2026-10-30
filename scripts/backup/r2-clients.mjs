import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { createS3ObjectStore } from '../../src/plugins/h5p/server/src/storage/object-store.mjs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
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
    // Cloudflare R2 rejects the AWS SDK's managed multipart path for these
    // backup copies. Current durable objects are well below the 5 GB single
    // PutObject limit, so use the S3-compatible single-request operation.
    createUpload: ({ client: s3Client, params }) => ({
      done: () => s3Client.send(new PutObjectCommand(params)),
    }),
  });
}
