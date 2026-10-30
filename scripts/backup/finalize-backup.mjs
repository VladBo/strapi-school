import { Readable } from 'node:stream';

import { createObjectStoreFromEnvironment } from './r2-clients.mjs';

async function main() {
  const snapshotPrefix = process.argv[2];
  if (!snapshotPrefix || !/^snapshots\/[^/]+$/.test(snapshotPrefix)) {
    throw new Error('Usage: node finalize-backup.mjs snapshots/<timestamp>');
  }
  const store = createObjectStoreFromEnvironment('BACKUP_S3');
  await store.head(`${snapshotPrefix}/manifest.json`);
  await store.put(
    `${snapshotPrefix}/complete.json`,
    Readable.from([JSON.stringify({ completedAt: new Date().toISOString() })]),
    { contentType: 'application/json' },
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
