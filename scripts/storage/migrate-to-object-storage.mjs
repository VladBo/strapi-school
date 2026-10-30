import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import migration from './migrate-to-object-storage.js';
import { createS3ObjectStore } from '../../src/plugins/h5p/server/src/storage/object-store.mjs';

const require = createRequire(import.meta.url);
const { buildUploadConfig } = require('../../src/storage/storage-config.cjs');
const { config: loadDotenv } = require('dotenv');

const { buildMigrationPlan, executeMigrationPlan } = migration;
const defaultDryRunAssetBaseUrl = 'https://assets.invalid';

export function parseArguments(argumentsList) {
  const parsed = { apply: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--apply') {
      parsed.apply = true;
      continue;
    }
    if (argument === '--report' || argument === '--resume-report') {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a file path`);
      }
      parsed[argument === '--report' ? 'reportPath' : 'resumeReportPath'] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return parsed;
}

export function isMigrationFailure(report) {
  return report.summary.errors > 0 || report.summary.conflicts > 0;
}

function environment(name, fallback) {
  return process.env[name] ?? fallback;
}

function createObjectStoreForApply() {
  const upload = buildUploadConfig(environment);
  if (!upload) {
    throw new Error('--apply requires STORAGE_DRIVER=s3 and complete S3 configuration');
  }
  const { providerOptions } = upload.config;
  const { s3Options } = providerOptions;
  const client = new S3Client({
    credentials: s3Options.credentials,
    endpoint: s3Options.endpoint,
    forcePathStyle: false,
    region: s3Options.region,
  });
  return createS3ObjectStore({
    bucket: s3Options.params.Bucket,
    client,
    // Cloudflare R2 rejected multipart uploads from the migration's large H5P
    // videos with a malformed-XML error. The migration set is small enough for
    // single PUT requests (largest current file is under 50 MB).
    createUpload: ({ client: s3Client, params }) => ({
      done: () => s3Client.send(new PutObjectCommand(params)),
    }),
  });
}

async function createApplication() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  return createStrapi(await compileStrapi()).load();
}

async function readResumeReport(reportPath) {
  if (!reportPath) return undefined;
  return JSON.parse(await fs.readFile(path.resolve(reportPath), 'utf8'));
}

async function writeReport(reportPath, report) {
  if (!reportPath) return;
  const absolutePath = path.resolve(reportPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
}

export async function runMigration({ argumentsList = process.argv.slice(2) } = {}) {
  const { apply, reportPath, resumeReportPath } = parseArguments(argumentsList);
  loadDotenv({ path: path.resolve('.env') });
  const store = apply ? createObjectStoreForApply() : undefined;
  const resumeReport = await readResumeReport(resumeReportPath);
  let app;

  try {
    app = await createApplication();
    app.log.level = 'error';
    const mediaRows = await app.db.query('plugin::upload.file').findMany({
      select: ['id', 'name', 'provider', 'url'],
    });
    const assetBaseUrl = apply
      ? buildUploadConfig(environment).config.providerOptions.baseUrl
      : process.env.ASSET_BASE_URL || defaultDryRunAssetBaseUrl;
    const plan = await buildMigrationPlan({ assetBaseUrl, mediaRows, root: process.cwd() });
    const report = await executeMigrationPlan(plan, {
      apply,
      resumeReport,
      store,
      updateMedia: (update) =>
        app.db.query('plugin::upload.file').update({
          data: { provider: update.provider, url: update.url },
          where: { id: update.id },
        }),
    });
    await writeReport(reportPath, report);
    return report;
  } finally {
    if (app) await app.destroy();
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  runMigration()
    .then((report) => {
      console.log(
        JSON.stringify(
          {
            mediaRowsPending: report.mediaUpdates.length,
            mode: report.mode,
            plan: report.plan,
            reportFile: parseArguments(process.argv.slice(2)).reportPath,
            summary: report.summary,
          },
          null,
          2,
        ),
      );
      if (isMigrationFailure(report)) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exitCode = 1;
    });
}
