import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';

import { createObjectStoreFromEnvironment } from './r2-clients.mjs';

export const DURABLE_PREFIXES = ['media/', 'h5p/libraries/', 'h5p/content/'];

function checksumStream(stream) {
  const digest = crypto.createHash('sha256');
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      digest.update(chunk);
      callback(null, chunk);
    },
  });
  return { digest, stream: stream.pipe(transform) };
}

async function hashStream(stream) {
  const digest = crypto.createHash('sha256');
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    digest.update(buffer);
    size += buffer.length;
  }
  return { sha256: digest.digest('hex'), size };
}

function snapshotKey(snapshotPrefix, key) {
  return `${snapshotPrefix.replace(/\/+$/, '')}/${key}`;
}

async function copyObject({ destination, source, snapshotPrefix, key }) {
  const sourceObject = await source.get(key);
  const { digest, stream } = checksumStream(sourceObject.stream);
  const destinationKey = snapshotKey(snapshotPrefix, key);
  await destination.put(destinationKey, stream, {
    contentLength: sourceObject.size,
    contentType: sourceObject.contentType,
  });
  const sha256 = digest.digest('hex');
  const destinationHead = await destination.head(destinationKey);
  if (destinationHead.size !== sourceObject.size) {
    throw new Error(`Size verification failed for ${key}`);
  }
  const destinationObject = await destination.get(destinationKey);
  const verified = await hashStream(destinationObject.stream);
  if (verified.size !== sourceObject.size || verified.sha256 !== sha256) {
    throw new Error(`Checksum verification failed for ${key}`);
  }
  return { key, sha256, size: sourceObject.size };
}

export async function snapshotObjects({
  destination,
  source,
  snapshotPrefix,
  prefixes = DURABLE_PREFIXES,
  writeCompletion = true,
}) {
  const objects = [];
  for (const prefix of prefixes) {
    const listed = await source.list(prefix);
    for (const object of listed.sort((left, right) => left.key.localeCompare(right.key))) {
      if (!object.key.startsWith(prefix)) {
        throw new Error(`Live object escaped requested prefix: ${object.key}`);
      }
      objects.push(await copyObject({ destination, key: object.key, snapshotPrefix, source }));
    }
  }
  objects.sort((left, right) => left.key.localeCompare(right.key));
  const manifest = {
    createdAt: new Date().toISOString(),
    objects,
    prefixes,
    snapshotPrefix,
  };
  await destination.put(
    snapshotKey(snapshotPrefix, 'manifest.json'),
    Readable.from([JSON.stringify(manifest, null, 2)]),
    { contentType: 'application/json' },
  );
  if (writeCompletion) {
    await destination.put(
      snapshotKey(snapshotPrefix, 'complete.json'),
      Readable.from([JSON.stringify({ completedAt: new Date().toISOString() })]),
      { contentType: 'application/json' },
    );
  }
  return manifest;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const snapshotPrefix = argumentValue('--snapshot-prefix');
  const manifestPath = argumentValue('--manifest');
  if (!snapshotPrefix || !manifestPath) {
    throw new Error('Usage: --snapshot-prefix snapshots/<timestamp> --manifest <path>');
  }
  const manifest = await snapshotObjects({
    destination: createObjectStoreFromEnvironment('BACKUP_S3'),
    snapshotPrefix,
    source: createObjectStoreFromEnvironment('LIVE_S3'),
    writeCompletion: false,
  });
  await fs.mkdir(path.dirname(path.resolve(manifestPath)), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ objects: manifest.objects.length, snapshotPrefix }, null, 2));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
