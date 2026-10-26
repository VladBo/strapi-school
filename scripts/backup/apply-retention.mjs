import {
  completedSnapshotsFromObjects,
  planRetention,
} from './backup-policy.mjs';
import { createObjectStoreFromEnvironment } from './r2-clients.mjs';

async function main() {
  const apply = process.argv.includes('--apply-retention');
  const store = createObjectStoreFromEnvironment('BACKUP_S3');
  const snapshots = completedSnapshotsFromObjects(await store.list('snapshots/'));
  const plan = planRetention(snapshots);
  if (apply) {
    for (const prefix of plan.deletePrefixes) await store.deletePrefix(prefix);
  }
  console.log(JSON.stringify({ ...plan, mode: apply ? 'apply' : 'dry-run' }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
