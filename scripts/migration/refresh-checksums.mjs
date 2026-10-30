import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const packageRoot = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('Usage: node refresh-checksums.mjs <package-directory>');
  process.exit(1);
}

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

const lines = [];
for (const filePath of (await listFiles(packageRoot)).sort()) {
  const hash = crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
  lines.push(`${hash}  ${path.relative(packageRoot, filePath)}`);
}
await fs.writeFile(path.join(packageRoot, 'checksums.sha256'), `${lines.join('\n')}\n`, 'utf8');
console.log(`Checksummed ${lines.length} files.`);
