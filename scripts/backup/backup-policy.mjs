function timestampFor(snapshot) {
  const timestamp = snapshot.prefix.replace(/^snapshots\//, '').replace(/\/$/, '');
  const parsed = new Date(
    timestamp.replace(/T(\d{2})-(\d{2})-(\d{2})Z$/, 'T$1:$2:$3Z'),
  );
  if (Number.isNaN(parsed.valueOf())) throw new TypeError(`Invalid snapshot prefix: ${snapshot.prefix}`);
  return parsed;
}

function monthKey(snapshot) {
  return timestampFor(snapshot).toISOString().slice(0, 7);
}

function safeSnapshotPrefix(prefix) {
  return /^snapshots\/[^/]+$/.test(prefix);
}

export function planRetention(snapshots, { weekly = 8, monthEnds = 6 } = {}) {
  const incomplete = snapshots.filter((snapshot) => !snapshot.completed);
  const completed = snapshots
    .filter((snapshot) => snapshot.completed)
    .map((snapshot) => ({ ...snapshot, timestamp: timestampFor(snapshot) }))
    .sort((left, right) => right.timestamp - left.timestamp);
  const keep = new Set(completed.slice(0, weekly).map((snapshot) => snapshot.prefix));
  const monthly = [];
  const months = new Set();
  for (const snapshot of completed) {
    const month = monthKey(snapshot);
    if (months.has(month)) continue;
    months.add(month);
    monthly.push(snapshot);
    if (monthly.length === monthEnds) break;
  }
  for (const snapshot of monthly) keep.add(snapshot.prefix);
  for (const snapshot of incomplete) keep.add(snapshot.prefix);

  const deletePrefixes = completed
    .filter((snapshot) => !keep.has(snapshot.prefix))
    .map((snapshot) => snapshot.prefix)
    .filter(safeSnapshotPrefix)
    .sort();
  return {
    deletePrefixes,
    keepPrefixes: [...keep].sort(),
  };
}

export function planRetentionAfterVerification({
  snapshots,
  snapshotSucceeded = true,
  verified,
  policy,
}) {
  if (!snapshotSucceeded) throw new Error('Snapshot must succeed before retention');
  if (!verified) throw new Error('Verification must succeed before retention');
  return planRetention(snapshots, policy);
}

export function completedSnapshotsFromObjects(objects) {
  return objects
    .filter((object) => object.key.endsWith('/complete.json'))
    .map((object) => ({
      completed: true,
      prefix: object.key.slice(0, -'/complete.json'.length),
    }));
}
