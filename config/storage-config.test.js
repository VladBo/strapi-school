const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const completeEnvironment = {
  STORAGE_DRIVER: 's3',
  S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'access-key',
  S3_SECRET_ACCESS_KEY: 'secret-key',
  S3_LIVE_BUCKET: 'school-live',
  ASSET_BASE_URL: 'https://assets.example.test/',
};

function envFrom(values) {
  return (name, fallback) => values[name] ?? fallback;
}

test('keeps Strapi local upload storage when external storage is disabled', async () => {
  const { buildUploadConfig, getAssetOrigin } = await import('./storage-config.mjs');

  assert.equal(buildUploadConfig(envFrom({ STORAGE_DRIVER: 'local' })), undefined);
  assert.equal(getAssetOrigin(envFrom({ STORAGE_DRIVER: 'local' })), undefined);
});

test('rejects incomplete S3 configuration instead of falling back to local storage', async () => {
  const { buildUploadConfig } = await import('./storage-config.mjs');

  for (const missing of Object.keys(completeEnvironment).filter(
    (name) => name !== 'STORAGE_DRIVER',
  )) {
    const values = { ...completeEnvironment };
    delete values[missing];
    assert.throws(
      () => buildUploadConfig(envFrom(values)),
      new RegExp(missing),
    );
  }
});

test('configures the official S3 provider for stable R2 media URLs', async () => {
  const { buildAssetSecuritySources, buildUploadConfig, getAssetOrigin } =
    await import('./storage-config.mjs');
  const upload = buildUploadConfig(envFrom(completeEnvironment));

  assert.equal(upload.config.provider, 'aws-s3');
  assert.equal(upload.config.providerOptions.baseUrl, 'https://assets.example.test');
  assert.notEqual(
    upload.config.providerOptions.baseUrl,
    completeEnvironment.S3_ENDPOINT,
  );
  assert.equal(upload.config.providerOptions.rootPath, 'media');
  assert.deepEqual(upload.config.providerOptions.s3Options, {
    endpoint: completeEnvironment.S3_ENDPOINT,
    region: 'auto',
    forcePathStyle: false,
    credentials: {
      accessKeyId: completeEnvironment.S3_ACCESS_KEY_ID,
      secretAccessKey: completeEnvironment.S3_SECRET_ACCESS_KEY,
    },
    params: { Bucket: completeEnvironment.S3_LIVE_BUCKET },
  });
  assert.deepEqual(upload.config.actionOptions.upload, { ACL: undefined });
  assert.deepEqual(upload.config.actionOptions.uploadStream, { ACL: undefined });
  assert.equal(getAssetOrigin(envFrom(completeEnvironment)), 'https://assets.example.test');
  assert.deepEqual(buildAssetSecuritySources(envFrom(completeEnvironment)), {
    imgSrc: ['https://assets.example.test'],
    mediaSrc: ['https://assets.example.test'],
    connectSrc: ['https://assets.example.test'],
  });
});

test('honors an explicit S3 region and rejects unknown storage drivers', async () => {
  const { buildUploadConfig } = await import('./storage-config.mjs');
  const upload = buildUploadConfig(
    envFrom({ ...completeEnvironment, S3_REGION: 'eu-west-1' }),
  );

  assert.equal(upload.config.providerOptions.s3Options.region, 'eu-west-1');
  assert.throws(
    () => buildUploadConfig(envFrom({ STORAGE_DRIVER: 'mystery' })),
    /Unsupported STORAGE_DRIVER/,
  );
});

test('copies runtime configuration outside Strapi configuration discovery before compilation', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
  );

  assert.match(
    packageJson.scripts.build,
    /^npm run build:h5p && npm run build:runtime && strapi build$/,
  );
  assert.match(
    packageJson.scripts['build:runtime'],
    /^rm -f dist\/config\/storage-config\.cjs && mkdir -p dist\/src\/storage && cp src\/storage\/storage-config\.cjs dist\/src\/storage\/storage-config\.cjs$/,
  );
});
