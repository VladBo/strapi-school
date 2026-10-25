'use strict';

const fs = require('fs-extra');
const path = require('node:path');

const packageRoot = path.resolve(process.argv[2] || '');
const inputPath = path.join(packageRoot, 'migration-input.json');

if (!process.argv[2] || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/migration/verify-drupal.js <editor-export-directory>');
  process.exit(1);
}

const input = fs.readJsonSync(inputPath);

async function loadStrapi() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  return createStrapi(await compileStrapi()).load();
}

function sorted(values) {
  return [...values].map(Number).sort((a, b) => a - b);
}

function missing(expected, actual) {
  const actualSet = new Set(actual.map(Number));
  return sorted(expected.filter((value) => !actualSet.has(Number(value))));
}

async function main() {
  const app = await loadStrapi();
  app.log.level = 'error';

  try {
    const articles = await app.documents('api::article.article').findMany({
      status: 'published',
      filters: { legacyNid: { $notNull: true } },
      populate: ['blocks', 'cover'],
      limit: 100,
    });
    const pages = await app.documents('api::page.page').findMany({
      status: 'published',
      filters: { legacyNid: { $notNull: true } },
      populate: ['blocks', 'cover'],
      limit: 100,
    });
    const h5p = await app.documents('api::h5p-content.h5p-content').findMany({
      status: 'draft',
      filters: { legacyNid: { $notNull: true } },
      limit: 100,
    });
    const uploadFiles = await app.db.query('plugin::upload.file').findMany({ limit: 1000 });
    const migratedMedia = uploadFiles.filter((file) => /\[drupal-fid:\d+\]/.test(file.caption || ''));

    const expectedArticleNids = input.nodes
      .filter((node) => ['article', 'news'].includes(node.type))
      .map((node) => node.nid);
    const expectedPageNids = input.nodes
      .filter((node) => ['page', 'slide', 'adress', 'webform'].includes(node.type))
      .map((node) => node.nid);
    const expectedH5pNids = input.nodes
      .filter((node) => node.type === 'h5p_content')
      .map((node) => node.nid);
    const expectedMediaFids = input.files
      .filter((file) => file.copied && file.exportPath)
      .map((file) => file.fid);
    const actualMediaFids = migratedMedia.map((file) => Number((file.caption.match(/\[drupal-fid:(\d+)\]/) || [])[1]));

    const contentBodies = [...articles, ...pages]
      .flatMap((document) => document.blocks || [])
      .map((block) => block.body || '')
      .join('\n');
    const staleMediaReferences = [...contentBodies.matchAll(/(?:public:\/\/|sites\/default\/files\/)[^\s)"']+/g)]
      .map((match) => match[0]);

    const report = {
      verifiedAt: new Date().toISOString(),
      expected: {
        articles: expectedArticleNids.length,
        pages: expectedPageNids.length,
        h5pDrafts: expectedH5pNids.length,
        media: expectedMediaFids.length,
      },
      actual: {
        articles: articles.length,
        pages: pages.length,
        h5pDrafts: h5p.length,
        media: migratedMedia.length,
      },
      missing: {
        articleNids: missing(expectedArticleNids, articles.map((item) => item.legacyNid)),
        pageNids: missing(expectedPageNids, pages.map((item) => item.legacyNid)),
        h5pNids: missing(expectedH5pNids, h5p.map((item) => item.legacyNid)),
        mediaFids: missing(expectedMediaFids, actualMediaFids),
      },
      staleMediaReferences,
      intentionallyDeferred: {
        h5pPackageImport: expectedH5pNids.length,
        menus: Object.values(input.menus).flat().length,
        redirects: input.aliases.length,
        missingSourceFiles: input.files.filter((file) => !file.copied).map((file) => ({
          fid: file.fid,
          uri: file.uri,
        })),
      },
    };

    const failureCount = Object.values(report.missing).reduce((sum, values) => sum + values.length, 0)
      + report.staleMediaReferences.length;
    report.ok = failureCount === 0;
    await fs.writeJson(path.join(packageRoot, 'verification-report.json'), report, { spaces: 2 });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 2;
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
