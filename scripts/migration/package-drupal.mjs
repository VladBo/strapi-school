import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const [sourceJsonPath, drupalRoot, outputRoot] = process.argv.slice(2);

if (!sourceJsonPath || !drupalRoot || !outputRoot) {
  console.error('Usage: node package-drupal.mjs <source.json> <drupal-root> <output-directory>');
  process.exit(1);
}

const source = JSON.parse(await fs.readFile(sourceJsonPath, 'utf8'));

function csvValue(value) {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csv(rows, columns) {
  return [
    columns.map(csvValue).join(','),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')),
  ].join('\n') + '\n';
}

function safeName(value) {
  return String(value || 'untitled')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100) || 'untitled';
}

function nodeSlug(node) {
  const alias = node.alias || node.sourcePath;
  return safeName(alias.split('/').filter(Boolean).at(-1) || `node-${node.nid}`);
}

function referencedFids(node) {
  const ids = new Set();
  for (const items of Object.values(node.fields || {})) {
    for (const item of items || []) {
      if (item.fid) ids.add(Number(item.fid));
      if (item.file?.fid) ids.add(Number(item.file.fid));
    }
  }
  return [...ids].sort((a, b) => a - b);
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeJson(filePath, value, mode) {
  await ensureParent(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
}

async function copyFile(sourcePath, destinationPath) {
  await ensureParent(destinationPath);
  await fs.copyFile(sourcePath, destinationPath);
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

const restricted = source.restricted || {};
const publicSource = { ...source };
delete publicSource.restricted;

await writeJson(path.join(outputRoot, 'source.json'), publicSource);
await writeJson(path.join(outputRoot, 'restricted', 'comments.json'), restricted.comments || [], 0o600);
await writeJson(
  path.join(outputRoot, 'restricted', 'webform-submissions.json'),
  restricted.webformSubmissions || [],
  0o600,
);

const nodeRows = [];
for (const node of source.nodes) {
  const slug = nodeSlug(node);
  const baseName = `${String(node.nid).padStart(3, '0')}-${slug}`;
  const contentDirectory = path.join(outputRoot, 'content', safeName(node.type));
  const bodyFile = path.join(contentDirectory, `${baseName}.html`);
  const metadataFile = path.join(contentDirectory, `${baseName}.json`);
  await ensureParent(bodyFile);
  await fs.writeFile(bodyFile, node.bodyHtml || '', 'utf8');
  await writeJson(metadataFile, node);
  nodeRows.push({
    nid: node.nid,
    type: node.type,
    title: node.title,
    slug,
    published: node.status,
    sourceLocale: node.language,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    legacyPath: node.alias || node.sourcePath,
    bodyFile: path.relative(outputRoot, bodyFile),
    metadataFile: path.relative(outputRoot, metadataFile),
    mediaFids: referencedFids(node).join(' '),
    migrationStatus: 'pending',
    strapiDocumentId: '',
    editorNotes: '',
  });
}

await fs.writeFile(
  path.join(outputRoot, 'content.csv'),
  csv(nodeRows, [
    'nid',
    'type',
    'title',
    'slug',
    'published',
    'sourceLocale',
    'createdAt',
    'updatedAt',
    'legacyPath',
    'bodyFile',
    'metadataFile',
    'mediaFids',
    'migrationStatus',
    'strapiDocumentId',
    'editorNotes',
  ]),
  'utf8',
);

const fileRows = [];
for (const file of source.files) {
  const relativeSource = file.uri.startsWith('public://') ? file.uri.slice('public://'.length) : file.uri;
  const absoluteSource = path.resolve(drupalRoot, 'sites/default/files', relativeSource);
  const exportName = `${String(file.fid).padStart(3, '0')}__${safeName(path.basename(file.filename))}`;
  const destination = path.join(outputRoot, 'media', 'originals', exportName);
  let copied = false;
  try {
    await copyFile(absoluteSource, destination);
    copied = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  fileRows.push({
    ...file,
    exportPath: copied ? path.relative(outputRoot, destination) : '',
    copied,
  });
}
await fs.writeFile(
  path.join(outputRoot, 'files.csv'),
  csv(fileRows, ['fid', 'filename', 'uri', 'filemime', 'filesize', 'exportPath', 'copied']),
  'utf8',
);

const h5pSourceDirectory = path.join(drupalRoot, 'sites/default/files/h5p/exports');
const h5pFiles = (await fs.readdir(h5pSourceDirectory)).filter((name) => name.endsWith('.h5p')).sort();
const h5pRows = [];
for (const item of source.h5p) {
  const node = source.nodes.find((candidate) => candidate.nid === item.nid);
  const packageName = h5pFiles.find((name) => name.endsWith(`-${item.contentId}.h5p`)) || '';
  if (packageName) {
    await copyFile(
      path.join(h5pSourceDirectory, packageName),
      path.join(outputRoot, 'h5p', packageName),
    );
  }
  h5pRows.push({
    nid: item.nid,
    contentId: item.contentId,
    title: node?.title || '',
    library: item.library,
    published: node?.status ?? '',
    legacyPath: node?.alias || node?.sourcePath || '',
    package: packageName ? `h5p/${packageName}` : '',
    migrationStatus: 'pending',
    strapiDocumentId: '',
    editorNotes: '',
  });
}
await fs.writeFile(
  path.join(outputRoot, 'h5p.csv'),
  csv(h5pRows, [
    'nid',
    'contentId',
    'title',
    'library',
    'published',
    'legacyPath',
    'package',
    'migrationStatus',
    'strapiDocumentId',
    'editorNotes',
  ]),
  'utf8',
);

const menuRows = Object.entries(source.menus).flatMap(([menu, links]) =>
  links.map((link) => ({ menu, ...link })),
);
await fs.writeFile(
  path.join(outputRoot, 'menus.csv'),
  csv(menuRows, [
    'menu',
    'mlid',
    'plid',
    'title',
    'path',
    'hidden',
    'external',
    'weight',
    'depth',
    'language',
  ]),
  'utf8',
);

await fs.writeFile(
  path.join(outputRoot, 'redirects.csv'),
  csv(source.aliases, ['pid', 'source', 'alias', 'language']),
  'utf8',
);

await writeJson(path.join(outputRoot, 'migration-input.json'), {
  exportedAt: source.exportedAt,
  nodes: source.nodes,
  files: fileRows,
  h5p: h5pRows,
  menus: source.menus,
  aliases: source.aliases,
});

const readme = `# Drupal Editor Export

Generated: ${new Date().toISOString()}

This package contains ${source.nodes.length} Drupal nodes, ${fileRows.filter((file) => file.copied).length} copied managed files, ${h5pRows.filter((item) => item.package).length} H5P packages, and ${source.aliases.length} URL aliases.

## Editor workflow

1. Use \`content.csv\` as the migration checklist.
2. Review the matching HTML and JSON files under \`content/\`.
3. Upload files from \`media/originals/\` before fixing links in rich text.
4. Import H5P archives from \`h5p/\` only after the required libraries are installed and tested.
5. Rebuild navigation from \`menus.csv\` and implement aliases from \`redirects.csv\`.
6. Record each destination document ID and status in the CSV files.

The \`restricted/\` directory contains comments and historical webform submissions. Treat it as personal data and do not upload it to Strapi without a retention decision.
`;
await fs.writeFile(path.join(outputRoot, 'README.md'), readme, 'utf8');

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await listFiles(absolutePath));
    else if (entry.name !== 'checksums.sha256') results.push(absolutePath);
  }
  return results;
}

const checksumLines = [];
for (const filePath of (await listFiles(outputRoot)).sort()) {
  const hash = crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
  checksumLines.push(`${hash}  ${path.relative(outputRoot, filePath)}`);
}
await fs.writeFile(path.join(outputRoot, 'checksums.sha256'), `${checksumLines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
  outputRoot,
  nodes: source.nodes.length,
  filesCopied: fileRows.filter((file) => file.copied).length,
  filesMissing: fileRows.filter((file) => !file.copied).length,
  h5pPackages: h5pRows.filter((item) => item.package).length,
  aliases: source.aliases.length,
}, null, 2));
