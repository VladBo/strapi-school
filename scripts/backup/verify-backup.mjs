import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { createObjectStoreFromEnvironment } from './r2-clients.mjs';

async function checksum(stream) {
  const hash = crypto.createHash('sha256');
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    hash.update(buffer);
    size += buffer.length;
  }
  return { sha256: hash.digest('hex'), size };
}

export async function verifySnapshot({ manifest, store, requireCompletion = true }) {
  if (requireCompletion) await store.head(`${manifest.snapshotPrefix}/complete.json`);
  for (const object of manifest.objects) {
    const snapshotObject = await store.get(`${manifest.snapshotPrefix}/${object.key}`);
    const actual = await checksum(snapshotObject.stream);
    if (actual.size !== object.size || actual.sha256 !== object.sha256) {
      throw new Error(`Snapshot verification failed for ${object.key}`);
    }
  }
  return { objects: manifest.objects.length, verified: true };
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error('Usage: node verify-backup.mjs <manifest.json>');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const result = await verifySnapshot({
    manifest,
    requireCompletion: false,
    store: createObjectStoreFromEnvironment('BACKUP_S3'),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
