export default [
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
          ],
          "connect-src": ["'self'", "https://h5p.org", "https://*.h5p.org"],
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  "plugin::h5p.h5p",
];
