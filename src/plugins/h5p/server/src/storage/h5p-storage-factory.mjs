import { S3Client } from '@aws-sdk/client-s3';
import { createRequire } from 'node:module';

import { createS3ObjectStore } from './object-store.mjs';
import { createR2ContentStorage } from './r2-content-storage.mjs';
import { createR2LibraryStorage } from './r2-library-storage.mjs';

const require = createRequire(import.meta.url);
const h5pServer = require('@lumieducation/h5p-server');

const REQUIRED_S3_SETTINGS = [
  'endpoint',
  'region',
  'accessKeyId',
  'secretAccessKey',
  'bucket',
];

function requirePaths({ libraryPath, contentPath, temporaryPath }) {
  for (const [name, value] of Object.entries({ libraryPath, contentPath, temporaryPath })) {
    if (!value) throw new TypeError(`${name} is required for H5P storage`);
  }
}

export function createH5PStorages({
  driver = 'local',
  libraryPath,
  contentPath,
  temporaryPath,
  s3 = {},
}) {
  requirePaths({ libraryPath, contentPath, temporaryPath });
  const temporaryStorage =
    new h5pServer.fsImplementations.DirectoryTemporaryFileStorage(temporaryPath);

  if (driver === 'local') {
    return {
      driver,
      libraryStorage: new h5pServer.fsImplementations.FileLibraryStorage(libraryPath),
      contentStorage: new h5pServer.fsImplementations.FileContentStorage(contentPath),
      temporaryStorage,
      objectStore: null,
    };
  }

  if (driver !== 's3') throw new TypeError(`Unsupported H5P storage driver: ${driver}`);
  for (const setting of REQUIRED_S3_SETTINGS) {
    if (!s3[setting]) throw new TypeError(`S3 setting ${setting} is required`);
  }

  const client =
    s3.client ??
    new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      forcePathStyle: false,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
  const common = { client, bucket: s3.bucket };
  const objectStore = createS3ObjectStore({ ...common, prefix: 'h5p' });
  const libraryStore = createS3ObjectStore({ ...common, prefix: 'h5p/libraries' });
  const contentStore = createS3ObjectStore({ ...common, prefix: 'h5p/content' });

  return {
    driver,
    libraryStorage: createR2LibraryStorage({ store: libraryStore }),
    contentStorage: createR2ContentStorage({ store: contentStore }),
    temporaryStorage,
    objectStore,
  };
}
