import path from "node:path";
import fs from "fs-extra";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".html": "text/html",
};

function containsPathTraversal(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return normalized.includes("..") || filePath.includes("..");
}

export default (
  config: unknown,
  {
    strapi,
  }: {
    strapi: Record<string, unknown> & {
      dirs: { static: { public: string } };
      log: { error: (...args: unknown[]) => void };
    };
  },
) => {
  return async (
    ctx: { request: { url: string }; type: string; body: unknown },
    next: () => Promise<void>,
  ) => {
    const { url } = ctx.request;

    // Handle H5P core assets
    if (url.startsWith("/api/h5p/core/")) {
      const filePath = url.replace("/api/h5p/core/", "").split("?")[0];

      if (containsPathTraversal(filePath)) {
        ctx.body = "Forbidden";
        return;
      }

      const fullPath = path.join(
        strapi.dirs.static.public,
        "uploads/h5p/core",
        filePath,
      );

      try {
        if (await fs.pathExists(fullPath)) {
          const ext = path.extname(fullPath);
          ctx.type = MIME_TYPES[ext] || "application/octet-stream";

          // Special handling for jQuery - modify it to force browser mode
          if (filePath === "js/jquery.js") {
            const originalContent = await fs.readFile(fullPath, "utf-8");
            const modifiedContent = originalContent.replace(
              '"object"==typeof module&&"object"==typeof module.exports?',
              "false&&false?",
            );
            ctx.body = modifiedContent;
            return;
          }

          // Special handling for h5p.js - ensure H5P.jQuery is set before it runs
          if (filePath === "js/h5p.js") {
            const originalContent = await fs.readFile(fullPath, "utf-8");
            ctx.body = `
// Ensure H5P.jQuery is set before h5p.js runs
(function() {
  var jq = window.jQuery || window.$ || (typeof jQuery !== 'undefined' ? jQuery : null);
  if (typeof jq === 'function') {
    window.H5P = window.H5P || {};
    window.H5P.jQuery = jq;
    window.H5PEditor = window.H5PEditor || {};
    window.H5PEditor.$ = jq;
  }
})();

${originalContent}
`;
            return;
          }

          ctx.body = await fs.readFile(fullPath);
          return;
        }
      } catch (error) {
        strapi.log.error("[h5p-static] Failed to read core file:", error);
      }
    }

    // Handle H5P editor assets
    if (url.startsWith("/api/h5p/editor/")) {
      const filePath = url.replace("/api/h5p/editor/", "").split("?")[0];

      if (containsPathTraversal(filePath)) {
        ctx.body = "Forbidden";
        return;
      }

      const fullPath = path.join(
        strapi.dirs.static.public,
        "uploads/h5p/editor",
        filePath,
      );

      try {
        if (await fs.pathExists(fullPath)) {
          const ext = path.extname(fullPath);
          ctx.type = MIME_TYPES[ext] || "application/octet-stream";

          // Special handling for language files
          if (filePath.startsWith("language/") && filePath.endsWith(".js")) {
            const originalContent = await fs.readFile(fullPath, "utf-8");
            ctx.body = `
// Ensure H5PEditor.language exists before setting language.core
(function() {
  window.H5PEditor = window.H5PEditor || {};
  window.H5PEditor.language = window.H5PEditor.language || {};
})();

${originalContent}
`;
            return;
          }

          ctx.body = await fs.readFile(fullPath);
          return;
        }
      } catch (error) {
        strapi.log.error("[h5p-static] Failed to read editor file:", error);
      }
    }

    // Handle H5P libraries
    if (url.startsWith("/api/h5p/libraries/")) {
      const filePath = url.replace("/api/h5p/libraries/", "").split("?")[0];

      if (containsPathTraversal(filePath)) {
        ctx.body = "Forbidden";
        return;
      }

      const fullPath = path.join(
        strapi.dirs.static.public,
        "uploads/h5p/libraries",
        filePath,
      );

      try {
        if (await fs.pathExists(fullPath)) {
          const ext = path.extname(fullPath);
          ctx.type = MIME_TYPES[ext] || "application/octet-stream";
          ctx.body = await fs.readFile(fullPath);
          return;
        }
      } catch (error) {
        strapi.log.error("[h5p-static] Failed to read library file:", error);
      }
    }

    await next();
  };
};
