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

export function planRetention(
  snapshots,
  { weekly = 4, monthEnds = 3, incompleteAgeDays = 7, now = new Date() } = {},
) {
  const incompleteCutoff = now.valueOf() - incompleteAgeDays * 24 * 60 * 60 * 1000;
  const incomplete = snapshots.filter((snapshot) => !snapshot.completed);
  const staleIncomplete = incomplete.filter((snapshot) => {
    const modifiedAt = snapshot.lastModified ? new Date(snapshot.lastModified).valueOf() : NaN;
    return Number.isFinite(modifiedAt) && modifiedAt < incompleteCutoff;
  });
  const keepIncomplete = incomplete.filter((snapshot) => !staleIncomplete.includes(snapshot));
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
  for (const snapshot of keepIncomplete) keep.add(snapshot.prefix);

  const deletePrefixes = [
    ...completed
      .filter((snapshot) => !keep.has(snapshot.prefix))
      .map((snapshot) => snapshot.prefix),
    ...staleIncomplete.map((snapshot) => snapshot.prefix),
  ]
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

export function snapshotsFromObjects(objects) {
  const snapshots = new Map();
  for (const object of objects) {
    const match = object.key.match(/^(snapshots\/[^/]+)\//);
    if (!match) continue;
    const prefix = match[1];
    const snapshot = snapshots.get(prefix) ?? { completed: false, prefix };
    if (object.key === `${prefix}/complete.json`) snapshot.completed = true;
    if (object.lastModified) {
      const lastModified = new Date(object.lastModified);
      if (!snapshot.lastModified || lastModified > new Date(snapshot.lastModified)) {
        snapshot.lastModified = lastModified.toISOString();
      }
    }
    snapshots.set(prefix, snapshot);
  }
  return [...snapshots.values()];
}
