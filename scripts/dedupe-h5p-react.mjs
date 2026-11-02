import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectReactPackage = require.resolve('react/package.json');
const pluginReactPackage = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/plugins/h5p/node_modules/react/package.json',
);

if (existsSync(pluginReactPackage)) {
  const pluginReactVersion = JSON.parse(readFileSync(pluginReactPackage, 'utf8')).version;
  const projectReactVersion = JSON.parse(readFileSync(projectReactPackage, 'utf8')).version;

  if (pluginReactVersion !== projectReactVersion) {
    throw new Error(
      `H5P requires React ${pluginReactVersion}, but Strapi provides ${projectReactVersion}. Refusing to remove a mismatched React copy.`,
    );
  }

  rmSync(dirname(pluginReactPackage), { recursive: true, force: true });
  console.info(
    `Removed H5P's nested React ${pluginReactVersion}; the editor now shares Strapi's React instance.`,
  );
}
