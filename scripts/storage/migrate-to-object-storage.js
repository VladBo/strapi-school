"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const mime = require("mime-types");

const SOURCE_ROOTS = [
  { kind: "media", directory: "public/uploads", destinationPrefix: "media" },
  {
    kind: "h5p-content",
    directory: "public/h5p/content",
    destinationPrefix: "h5p/content",
  },
  {
    kind: "h5p-library",
    directory: "public/h5p/libraries",
    destinationPrefix: "h5p/libraries",
  },
];

function sha256(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new TypeError("assetBaseUrl must be an HTTP(S) URL");
  }
  return value.replace(/\/+$/, "");
}

function safeRelativePath(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\\") ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new TypeError(`Unsafe source-relative path: ${relativePath}`);
  }
  return normalized;
}

async function listFiles(root, directory) {
  const absoluteDirectory = path.join(root, directory);
  let entries;
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, relativePath)));
      continue;
    }
    if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

function mediaPathFromUrl(url) {
  if (typeof url !== "string") return undefined;
  const pathname = new URL(url, "https://media.invalid").pathname;
  if (!pathname.startsWith("/uploads/")) return undefined;
  return safeRelativePath(pathname.slice("/uploads/".length));
}

function createMediaUpdates(mediaRows, objectKeys, assetBaseUrl) {
  const mediaUpdates = [];
  for (const row of mediaRows) {
    const relativePath = mediaPathFromUrl(row.url);
    if (!relativePath) continue;
    const key = `media/${relativePath}`;
    if (!objectKeys.has(key)) continue;
    mediaUpdates.push({
      id: row.id,
      provider: "aws-s3",
      url: `${assetBaseUrl}/${key}`,
    });
  }
  return mediaUpdates.sort((left, right) => Number(left.id) - Number(right.id));
}

async function buildMigrationPlan({ root = process.cwd(), mediaRows = [], assetBaseUrl }) {
  const normalizedRoot = path.resolve(root);
  const normalizedBaseUrl = normalizeBaseUrl(assetBaseUrl);
  const objects = [];
  const keys = new Set();

  for (const source of SOURCE_ROOTS) {
    const sourceFiles = await listFiles(normalizedRoot, source.directory);
    for (const sourceFile of sourceFiles) {
      const sourceRelativePath = safeRelativePath(path.relative(source.directory, sourceFile));
      const key = `${source.destinationPrefix}/${sourceRelativePath}`;
      if (keys.has(key)) throw new Error(`Multiple source files map to ${key}`);
      keys.add(key);

      const sourcePath = path.join(normalizedRoot, sourceFile);
      const body = await fs.readFile(sourcePath);
      objects.push({
        contentType: mime.lookup(sourcePath) || "application/octet-stream",
        key,
        kind: source.kind,
        sha256: sha256(body),
        size: body.length,
        sourcePath,
      });
    }
  }

  objects.sort((left, right) => left.key.localeCompare(right.key));
  return {
    createdAt: new Date().toISOString(),
    mediaUpdates: createMediaUpdates(mediaRows, keys, normalizedBaseUrl),
    mode: "dry-run",
    objects,
    root: normalizedRoot,
    summary: {
      bytes: objects.reduce((total, object) => total + object.size, 0),
      objects: objects.length,
      sourceKinds: Object.fromEntries(
        SOURCE_ROOTS.map(({ kind }) => [kind, objects.filter((object) => object.kind === kind).length]),
      ),
    },
  };
}

function isMissingObject(error) {
  return error?.code === "OBJECT_NOT_FOUND" || error?.status === 404 || error?.$metadata?.httpStatusCode === 404;
}

function emptySummary() {
  return {
    conflicts: 0,
    databaseUpdates: 0,
    deletes: 0,
    errors: 0,
    planned: 0,
    skipped: 0,
    uploaded: 0,
  };
}

async function inspectDestination(store, object) {
  try {
    const destination = await store.head(object.key);
    const destinationChecksum = destination.metadata?.sha256;
    if (destinationChecksum === object.sha256 && destination.size === object.size) {
      return { status: "skipped" };
    }
    return {
      error: `Destination object conflicts with ${object.key}`,
      status: "conflict",
    };
  } catch (error) {
    if (isMissingObject(error)) return { status: "missing" };
    throw error;
  }
}

async function uploadAndVerify(store, object) {
  const body = await fs.readFile(object.sourcePath);
  await store.put(object.key, body, {
    contentLength: object.size,
    contentType: object.contentType,
    metadata: { sha256: object.sha256 },
  });
  const destination = await store.head(object.key);
  if (destination.size !== object.size || destination.metadata?.sha256 !== object.sha256) {
    throw new Error(`Uploaded object failed verification: ${object.key}`);
  }
}

function buildReport(plan, { apply, items, summary, resumedFrom }) {
  return {
    finishedAt: new Date().toISOString(),
    items,
    mediaUpdates: plan.mediaUpdates,
    mode: apply ? "apply" : "dry-run",
    plan: plan.summary,
    resumedFrom: resumedFrom?.finishedAt,
    sourceRetained: true,
    summary,
  };
}

async function executeMigrationPlan(
  plan,
  { apply = false, resumeReport, store, updateMedia = async () => {} } = {},
) {
  const summary = emptySummary();
  if (!apply) {
    const items = plan.objects.map((object) => {
      summary.planned += 1;
      return { key: object.key, sha256: object.sha256, status: "planned" };
    });
    return buildReport(plan, { apply, items, summary, resumedFrom: resumeReport });
  }
  if (!store || typeof store.head !== "function" || typeof store.put !== "function") {
    throw new TypeError("A destination object store with head and put methods is required for --apply");
  }

  const items = [];
  for (const object of plan.objects) {
    try {
      const destination = await inspectDestination(store, object);
      if (destination.status === "skipped") {
        summary.skipped += 1;
        items.push({ key: object.key, sha256: object.sha256, status: "skipped" });
        continue;
      }
      if (destination.status === "conflict") {
        summary.conflicts += 1;
        items.push({ ...destination, key: object.key, sha256: object.sha256 });
        break;
      }

      await uploadAndVerify(store, object);
      summary.uploaded += 1;
      items.push({ key: object.key, sha256: object.sha256, status: "uploaded" });
    } catch (error) {
      summary.errors += 1;
      items.push({
        error: error.message || String(error),
        key: object.key,
        sha256: object.sha256,
        status: "error",
      });
      break;
    }
  }

  if (summary.errors === 0 && summary.conflicts === 0) {
    for (const update of plan.mediaUpdates) {
      await updateMedia(update);
      summary.databaseUpdates += 1;
    }
  }
  return buildReport(plan, { apply, items, summary, resumedFrom: resumeReport });
}

module.exports = { buildMigrationPlan, executeMigrationPlan };
