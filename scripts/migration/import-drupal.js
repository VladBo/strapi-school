'use strict';

const fs = require('fs-extra');
const crypto = require('node:crypto');
const path = require('node:path');
const mime = require('mime-types');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const packageRoot = path.resolve(process.argv[2] || '');
const apply = process.argv.includes('--apply');

const CONTACT_MAP_EMBED_URL =
  'https://www.google.com/maps?q=%D0%9B%D1%83%D1%86%D1%8C%D0%BA%2C%20%D0%B2%D1%83%D0%BB.%20%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%D1%81%D1%8C%D0%BA%D0%B0%2C%2028&output=embed';
const CONTACT_MAP_LINK_URL =
  'https://www.google.com/maps/search/?api=1&query=%D0%9B%D1%83%D1%86%D1%8C%D0%BA%2C%20%D0%B2%D1%83%D0%BB.%20%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%D1%81%D1%8C%D0%BA%2C%2028';

if (!process.argv[2]) {
  console.error('Usage: node scripts/migration/import-drupal.js <editor-export-directory> [--apply]');
  process.exit(1);
}

const inputPath = path.join(packageRoot, 'migration-input.json');
if (!fs.existsSync(inputPath)) {
  console.error(`Migration input not found: ${inputPath}`);
  process.exit(1);
}

const input = fs.readJsonSync(inputPath);
const turndown = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  headingStyle: 'atx',
});
turndown.use(gfm);
turndown.remove(['script', 'style']);

function htmlToMarkdown(value) {
  return turndown.turndown(String(value || '')).trim();
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function slugFromNode(node) {
  const source = node.alias || node.sourcePath || `node-${node.nid}`;
  return source
    .split('/')
    .filter(Boolean)
    .at(-1)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || `node-${node.nid}`;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstFieldItem(node, ...fieldNames) {
  for (const fieldName of fieldNames) {
    const item = node.fields?.[fieldName]?.[0];
    if (item) return item;
  }
  return null;
}

function firstFileId(node, ...fieldNames) {
  const item = firstFieldItem(node, ...fieldNames);
  return Number(item?.fid || item?.file?.fid || 0) || null;
}

function pageType(nodeType) {
  if (nodeType === 'slide') return 'slide';
  if (nodeType === 'adress') return 'contact';
  if (nodeType === 'webform') return 'form';
  return 'standard';
}

function bodyForNode(node) {
  let html = node.bodyHtml || '';
  if (node.type === 'adress') {
    const address = firstFieldItem(node, 'field_adressa')?.value;
    if (address && !html.includes(address)) html += `\n<p>${escapeHtml(address)}</p>`;
  }
  if (node.type === 'webform') {
    const address = firstFieldItem(node, 'field_adress')?.value;
    if (address && !html.includes(address)) html += `\n<p>${escapeHtml(address)}</p>`;
  }
  return html.trim();
}

async function createApplication() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  return createStrapi(appContext).load();
}

async function main() {
  const contentNodes = input.nodes.filter((node) => ['article', 'news', 'page', 'slide', 'adress', 'webform'].includes(node.type));
  const h5pNodes = input.nodes.filter((node) => node.type === 'h5p_content');
  const availableFiles = input.files.filter((file) => file.copied && file.exportPath);

  if (!apply) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      articles: contentNodes.filter((node) => ['article', 'news'].includes(node.type)).length,
      pages: contentNodes.filter((node) => !['article', 'news'].includes(node.type)).length,
      h5pPlaceholders: h5pNodes.length,
      mediaFiles: availableFiles.length,
      note: 'Run again with --apply after reviewing this summary.',
    }, null, 2));
    return;
  }

  const app = await createApplication();
  app.log.level = 'error';

  const report = {
    startedAt: new Date().toISOString(),
    media: { uploaded: 0, reused: 0, skipped: 0, errors: [] },
    content: { created: 0, updated: 0, skipped: 0, published: 0, drafts: 0, errors: [] },
    mappings: [],
  };
  const mediaByFid = new Map();

  try {
    for (const file of input.files) {
      if (!file.copied || !file.exportPath) {
        report.media.skipped += 1;
        continue;
      }

      const marker = `[drupal-fid:${file.fid}]`;
      let uploaded = await app.db.query('plugin::upload.file').findOne({
        where: { caption: { $contains: marker } },
      });

      if (uploaded) {
        report.media.reused += 1;
        mediaByFid.set(Number(file.fid), uploaded);
        continue;
      }

      const filePath = path.join(packageRoot, file.exportPath);
      try {
        const stats = await fs.stat(filePath);
        const [result] = await app.plugin('upload').service('upload').upload({
          files: {
            filepath: filePath,
            originalFileName: file.filename,
            size: stats.size,
            mimetype: file.filemime || mime.lookup(file.filename) || 'application/octet-stream',
          },
          data: {
            fileInfo: {
              name: file.filename,
              alternativeText: file.filename,
              caption: `Drupal source: ${file.uri} ${marker}`,
            },
          },
        });
        uploaded = result;
        mediaByFid.set(Number(file.fid), uploaded);
        report.media.uploaded += 1;
      } catch (error) {
        report.media.errors.push({ fid: file.fid, filename: file.filename, message: error.message });
      }
    }

    function rewriteMediaUrls(html) {
      let result = html || '';
      for (const file of input.files) {
        const uploaded = mediaByFid.get(Number(file.fid));
        if (!uploaded?.url || !file.uri?.startsWith('public://')) continue;
        const relativePath = file.uri.slice('public://'.length);
        const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result
          .replace(new RegExp(`https?://[^"'\\s]+/sites/default/files/${escapedPath}`, 'g'), uploaded.url)
          .replaceAll(`/sites/default/files/${relativePath}`, uploaded.url)
          .replaceAll(`sites/default/files/${relativePath}`, uploaded.url)
          .replaceAll(file.uri, uploaded.url);
      }
      return result;
    }

    async function uniqueSlug(uid, node) {
      const preferred = slugFromNode(node);
      const collision = await app.db.query(uid).findOne({ where: { slug: preferred } });
      if (!collision || Number(collision.legacyNid) === Number(node.nid)) return preferred;
      return `drupal-${node.nid}-${preferred}`;
    }

    async function upsertDocument(uid, node, data, shouldPublish) {
      const existing = await app.db.query(uid).findOne({ where: { legacyNid: node.nid } });
      const migrationHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ data, shouldPublish }))
        .digest('hex');
      let document;
      if (existing?.migrationHash === migrationHash) {
        document = existing;
        report.content.skipped += 1;
      } else if (existing) {
        document = await app.documents(uid).update({
          documentId: existing.documentId,
          data: { ...data, migrationHash },
        });
        report.content.updated += 1;
      } else {
        document = await app.documents(uid).create({ data: { ...data, migrationHash } });
        report.content.created += 1;
      }

      if (shouldPublish && existing?.migrationHash !== migrationHash) {
        await app.documents(uid).publish({ documentId: document.documentId });
        report.content.published += 1;
      } else if (!shouldPublish) {
        report.content.drafts += 1;
      }
      report.mappings.push({
        nid: node.nid,
        sourceType: node.type,
        destination: uid,
        documentId: document.documentId,
        status: shouldPublish ? 'published' : 'draft',
      });
      return document;
    }

    let author = await app.db.query('api::author.author').findOne({ where: { name: 'Жанна Бондарчук' } });
    if (!author) {
      author = await app.documents('api::author.author').create({ data: { name: 'Жанна Бондарчук' } });
    }
    const newsCategory = await app.db.query('api::category.category').findOne({ where: { slug: 'news' } });

    for (const node of contentNodes) {
      try {
        const rewrittenBody = rewriteMediaUrls(bodyForNode(node));
        const markdownBody =
          node.type === 'adress'
            ? '## Наша адреса\n\nм. Луцьк, вул. Львівська, 28\n\n## Контактна інформація\n\n- Телефон: [+38 (0332) 26-14-41](tel:+380332261441)\n- Електронна пошта: [zosh2luck@ukrpost.ua](mailto:zosh2luck@ukrpost.ua)'
            : htmlToMarkdown(rewrittenBody);
        const description =
          node.type === 'adress'
            ? 'Адреса та контактна інформація Луцької школи № 2.'
            : (node.bodySummary
                ? stripHtml(node.bodySummary)
                : stripHtml(rewrittenBody)
              ).slice(0, 500);
        const blocks = markdownBody ? [{ __component: 'shared.rich-text', body: markdownBody }] : [];

        if (['article', 'news'].includes(node.type)) {
          const coverFid = firstFileId(node, 'field_image', 'field_image_news', 'field_images_news');
          const cover = coverFid ? mediaByFid.get(coverFid) : null;
          await upsertDocument('api::article.article', node, {
            title: node.title,
            description,
            slug: await uniqueSlug('api::article.article', node),
            cover: cover ? { id: cover.id } : null,
            author: author ? { id: author.id } : null,
            category: node.type === 'news' && newsCategory ? { id: newsCategory.id } : null,
            blocks,
            legacyNid: node.nid,
            legacyPath: node.alias || node.sourcePath,
            // Drupal was configured with incorrect ru/en locale metadata;
            // the preserved content itself is Ukrainian.
            sourceLocale: 'uk',
            sourceCreatedAt: node.createdAt,
            sourceUpdatedAt: node.updatedAt,
            legacyData: node.fields,
          }, Boolean(node.status));
        } else {
          const coverFid = firstFileId(node, 'field_image');
          const cover = coverFid ? mediaByFid.get(coverFid) : null;
          const linkItem = firstFieldItem(node, 'field_link');
          await upsertDocument('api::page.page', node, {
            title: node.title,
            description,
            slug: await uniqueSlug('api::page.page', node),
            pageType: pageType(node.type),
            cover: cover ? { id: cover.id } : null,
            link: linkItem?.url || null,
            mapEmbedUrl:
              node.type === 'adress' ? CONTACT_MAP_EMBED_URL : null,
            mapLinkUrl:
              node.type === 'adress' ? CONTACT_MAP_LINK_URL : null,
            blocks,
            legacyNid: node.nid,
            legacyPath: node.alias || node.sourcePath,
            sourceLocale: 'uk',
            sourceCreatedAt: node.createdAt,
            sourceUpdatedAt: node.updatedAt,
            legacyData: node.fields,
          }, Boolean(node.status));
        }
      } catch (error) {
        report.content.errors.push({ nid: node.nid, type: node.type, message: error.message });
      }
    }

    for (const node of h5pNodes) {
      const h5p = input.h5p.find((item) => Number(item.nid) === Number(node.nid));
      try {
        await upsertDocument('api::h5p-content.h5p-content', node, {
          title: node.title,
          legacyNid: node.nid,
          legacyPath: node.alias || node.sourcePath,
          sourceLocale: 'uk',
          sourcePublished: Boolean(node.status),
          sourceLibrary: h5p?.library || null,
          packageFilename: h5p?.package ? path.basename(h5p.package) : null,
          migrationStatus: h5p?.package ? 'package-ready' : 'blocked',
        }, false);
      } catch (error) {
        report.content.errors.push({ nid: node.nid, type: node.type, message: error.message });
      }
    }

    const publicRole = await app.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
    if (publicRole) {
      for (const action of ['find', 'findOne']) {
        const actionName = `api::page.page.${action}`;
        const permission = await app.db.query('plugin::users-permissions.permission').findOne({
          where: { action: actionName, role: publicRole.id },
        });
        if (!permission) {
          await app.db.query('plugin::users-permissions.permission').create({
            data: { action: actionName, role: publicRole.id },
          });
        }
      }
    }
  } finally {
    report.finishedAt = new Date().toISOString();
    await fs.writeJson(path.join(packageRoot, 'migration-report.json'), report, { spaces: 2 });
    const mappingColumns = ['nid', 'sourceType', 'destination', 'documentId', 'status'];
    const mappingCsv = [
      mappingColumns.map(csvValue).join(','),
      ...report.mappings.map((mapping) => mappingColumns.map((column) => csvValue(mapping[column])).join(',')),
    ].join('\n') + '\n';
    await fs.writeFile(path.join(packageRoot, 'migration-report.csv'), mappingCsv, 'utf8');
    await app.destroy();
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.media.errors.length || report.content.errors.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
