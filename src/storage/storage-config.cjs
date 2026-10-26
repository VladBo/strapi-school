const REQUIRED_S3_SETTINGS = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_LIVE_BUCKET",
  "ASSET_BASE_URL",
];

function storageDriver(env) {
  return String(env("STORAGE_DRIVER", "local")).trim().toLowerCase();
}

function required(env, name) {
  const value = String(env(name, "")).trim();
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return value;
}

function normalizedUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must be a valid HTTP(S) URL`);
  }
  return value.replace(/\/+$/, "");
}

function readS3Settings(env) {
  const values = Object.fromEntries(
    REQUIRED_S3_SETTINGS.map((name) => [name, required(env, name)]),
  );
  return {
    endpoint: normalizedUrl(values.S3_ENDPOINT, "S3_ENDPOINT"),
    accessKeyId: values.S3_ACCESS_KEY_ID,
    secretAccessKey: values.S3_SECRET_ACCESS_KEY,
    bucket: values.S3_LIVE_BUCKET,
    assetBaseUrl: normalizedUrl(values.ASSET_BASE_URL, "ASSET_BASE_URL"),
    region: String(env("S3_REGION", "auto")).trim() || "auto",
  };
}

function buildUploadConfig(env) {
  const driver = storageDriver(env);
  if (driver === "local") return undefined;
  if (driver !== "s3") {
    throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  }

  const settings = readS3Settings(env);
  return {
    config: {
      provider: "aws-s3",
      providerOptions: {
        baseUrl: settings.assetBaseUrl,
        rootPath: "media",
        s3Options: {
          endpoint: settings.endpoint,
          region: settings.region,
          forcePathStyle: false,
          credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
          },
          params: { Bucket: settings.bucket },
        },
      },
      actionOptions: {
        // Cloudflare R2 does not implement S3 object ACLs.
        upload: { ACL: undefined },
        uploadStream: { ACL: undefined },
        delete: {},
      },
    },
  };
}

function getAssetOrigin(env) {
  if (storageDriver(env) !== "s3") return undefined;
  const assetBaseUrl = normalizedUrl(
    required(env, "ASSET_BASE_URL"),
    "ASSET_BASE_URL",
  );
  return new URL(assetBaseUrl).origin;
}

function buildAssetSecuritySources(env) {
  const assetOrigin = getAssetOrigin(env);
  return {
    imgSrc: assetOrigin ? [assetOrigin] : [],
    mediaSrc: assetOrigin ? [assetOrigin] : [],
    connectSrc: assetOrigin ? [assetOrigin] : [],
  };
}

module.exports = {
  buildAssetSecuritySources,
  buildUploadConfig,
  getAssetOrigin,
};
