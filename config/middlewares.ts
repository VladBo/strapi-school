import * as storageConfig from "./storage-options";

export default ({ env }) => {
  const assetSources = storageConfig.buildAssetSecuritySources(env);
  const upload = storageConfig.buildUploadConfig(env);
  const assetUrlRewriteConfig = upload
    ? {
        publicBaseUrl: upload.config.providerOptions.baseUrl,
        rootPath: upload.config.providerOptions.rootPath,
      }
    : undefined;

  return [
    "strapi::logger",
    "strapi::errors",
    {
      name: "strapi::security",
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "frame-src": ["'self'"],
            "img-src": [
              "'self'",
              "data:",
              "blob:",
              "https://h5p.org",
              "https://*.h5p.org",
              ...assetSources.imgSrc,
            ],
            "media-src": [
              "'self'",
              "data:",
              "blob:",
              ...assetSources.mediaSrc,
            ],
            "connect-src": [
              "'self'",
              "https://h5p.org",
              "https://*.h5p.org",
              ...assetSources.connectSrc,
            ],
          },
        },
      },
    },
    "strapi::cors",
    "strapi::poweredBy",
    "strapi::query",
    "strapi::body",
    "strapi::session",
    {
      name: "strapi::favicon",
      config: { path: "public/favicon.png" },
    },
    "strapi::public",
    ...(assetUrlRewriteConfig
      ? [
          {
            resolve: "./src/middlewares/r2-upload-url-rewriter",
            config: assetUrlRewriteConfig,
          },
        ]
      : []),
    "plugin::h5p.h5p",
  ];
};
