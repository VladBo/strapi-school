"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const path = require("path");
const fs = require("fs-extra");
const https = require("https");
const http = require("http");
const AdmZip = require("adm-zip");
const h5pServer = require("@lumieducation/h5p-server");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const path__default = /* @__PURE__ */ _interopDefault(path);
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const https__default = /* @__PURE__ */ _interopDefault(https);
const http__default = /* @__PURE__ */ _interopDefault(http);
const AdmZip__default = /* @__PURE__ */ _interopDefault(AdmZip);
const bootstrap = async ({ strapi }) => {
  const h5pService = strapi.plugin("h5p").service("service");
  await h5pService.initialize();
  strapi.log.info("H5P plugin bootstrapped");
};
const destroy = ({ strapi }) => {
};
const register = ({ strapi }) => {
  strapi.customFields.register({
    name: "h5p-editor",
    plugin: "h5p",
    type: "json"
    // Store H5P content as JSON
  });
};
const config = {
  default: {},
  validator() {
  }
};
const content = {
  schema: {
    kind: "collectionType",
    collectionName: "h5p_contents",
    info: {
      singularName: "content",
      pluralName: "contents",
      displayName: "H5P Content",
      description: "H5P interactive content"
    },
    options: {
      draftAndPublish: true
    },
    pluginOptions: {
      "content-manager": {
        visible: true
      },
      "content-type-builder": {
        visible: false
      }
    },
    attributes: {
      title: {
        type: "string",
        required: true
      },
      slug: {
        type: "uid",
        targetField: "title"
      },
      h5pContent: {
        type: "json",
        customField: "plugin::h5p.h5p-editor"
      }
    }
  }
};
const contentTypes = {
  content
};
const controller = ({ strapi }) => ({
  // Content methods
  async findContent(ctx) {
    try {
      const contents = await strapi.documents("api::h5p-content.h5p-content").findMany({
        ...ctx.query
      });
      ctx.body = contents;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async findOneContent(ctx) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: id,
        ...ctx.query
      });
      ctx.body = content2;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async createContent(ctx) {
    try {
      const { title, library, parameters, metadata } = ctx.request.body;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const embedCode = `<iframe src="${strapi.config.get("server.url")}/api/h5p/content/${slug}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
      const newContent = await strapi.documents("api::h5p-content.h5p-content").create({
        data: {
          title,
          slug,
          library,
          parameters,
          metadata,
          embedCode
        }
      });
      ctx.body = newContent;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async updateContent(ctx) {
    const { id } = ctx.params;
    try {
      const updatedContent = await strapi.documents("api::h5p-content.h5p-content").update({
        documentId: id,
        data: ctx.request.body
      });
      ctx.body = updatedContent;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async deleteContent(ctx) {
    const { id } = ctx.params;
    try {
      const deletedContent = await strapi.documents("api::h5p-content.h5p-content").delete({
        documentId: id
      });
      ctx.body = deletedContent;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  // Library methods
  async getLibraries(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getInstalledLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async getAvailableLibraries(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getAvailableLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async installLibrary(ctx) {
    try {
      const { libraryName, version } = ctx.request.body;
      const h5pService = strapi.plugin("h5p").service("service");
      const result = await h5pService.installLibrary(libraryName, version);
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async uploadLibrary(ctx) {
    try {
      const { files } = ctx.request;
      if (!files || !files.file) {
        ctx.throw(400, "No file uploaded");
      }
      const h5pService = strapi.plugin("h5p").service("service");
      const result = await h5pService.uploadLibraryPackage(files.file);
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  // H5P Content Rendering methods
  async playContent(ctx) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: id
      });
      if (!content2) {
        ctx.throw(404, "Content not found");
      }
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderContent(content2);
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async getEmbedCode(ctx) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: id
      });
      if (!content2) {
        ctx.throw(404, "Content not found");
      }
      const embedCode = content2.embedCode || `<iframe src="${strapi.config.get("server.url")}/api/h5p/content/${id}/play" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
      ctx.body = { embedCode };
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  // H5P Editor methods
  async getEditorNew(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderEditor();
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async getEditorEdit(ctx) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: id
      });
      if (!content2) {
        ctx.throw(404, "Content not found");
      }
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderEditor(content2);
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
  async saveEditorContent(ctx) {
    try {
      const { contentId, library, parameters, metadata } = ctx.request.body;
      if (contentId) {
        const updatedContent = await strapi.documents("api::h5p-content.h5p-content").update({
          documentId: contentId,
          data: {
            library,
            parameters,
            metadata
          }
        });
        ctx.body = updatedContent;
      } else {
        ctx.throw(400, "Content ID required for saving");
      }
    } catch (err) {
      ctx.throw(500, err);
    }
  }
});
const h5pEditorController = ({ strapi }) => ({
  /**
   * Get complete H5P editor page
   */
  async getEditorPage(ctx) {
    try {
      const { contentId } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderEditor(contentId);
      ctx.type = "html";
      ctx.body = html;
    } catch (error) {
      strapi.log.error("Error rendering H5P editor page:", error);
      ctx.throw(500, error);
    }
  },
  /**
   * Serve H5P core assets (CSS/JS)
   */
  async serveCoreAsset(ctx) {
    try {
      const { type, file } = ctx.params;
      const h5pServerPath = require.resolve("@lumieducation/h5p-server");
      const h5pPackageRoot = path__default.default.join(h5pServerPath, "../../../");
      const assetPath = path__default.default.join(h5pPackageRoot, "build/assets/core", type, file || "");
      if (!await fs__default.default.pathExists(assetPath)) {
        ctx.throw(404, "Asset not found");
        return;
      }
      const ext = path__default.default.extname(assetPath);
      const contentTypes2 = {
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf"
      };
      ctx.type = contentTypes2[ext] || "application/octet-stream";
      ctx.body = await fs__default.default.readFile(assetPath);
    } catch (error) {
      strapi.log.error("Error serving core asset:", error);
      ctx.throw(404, "Asset not found");
    }
  },
  /**
   * Serve H5P editor assets
   */
  async serveEditorAsset(ctx) {
    try {
      const { type, file } = ctx.params;
      const h5pServerPath = require.resolve("@lumieducation/h5p-server");
      const h5pPackageRoot = path__default.default.join(h5pServerPath, "../../../");
      const assetPath = path__default.default.join(h5pPackageRoot, "build/assets/editor", type, file || "");
      if (!await fs__default.default.pathExists(assetPath)) {
        ctx.throw(404, "Asset not found");
        return;
      }
      const ext = path__default.default.extname(assetPath);
      const contentTypes2 = {
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf"
      };
      ctx.type = contentTypes2[ext] || "application/octet-stream";
      ctx.body = await fs__default.default.readFile(assetPath);
    } catch (error) {
      strapi.log.error("Error serving editor asset:", error);
      ctx.throw(404, "Asset not found");
    }
  },
  /**
   * Handle H5P AJAX requests
   */
  async ajax(ctx) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const editor = h5pService.getEditor();
      // Support both GET (query) and POST (body) for action parameter
      const action = ctx.query.action || ctx.request.body?.action;
      const user = {
        id: ctx.state.user?.id || "1",
        name: ctx.state.user?.username || "anonymous",
        canUpdateAndInstallLibraries: true,
        canInstallRecommended: true,
        canCreateRestricted: true,
        type: "local"
      };
      switch (action) {
        case "libraries":
          const libraries = await editor.getLibraries();
          ctx.body = libraries;
          break;
        case "library-install":
          const { libraryId } = ctx.request.body;
          const installed = await editor.installLibraryFromHub(libraryId, user);
          ctx.body = { success: true, installed };
          break;
        case "library-upload":
          const { file } = ctx.request.files || {};
          if (file) {
            const result = await editor.uploadPackage(file.path, user);
            ctx.body = result;
          } else {
            ctx.throw(400, "No file uploaded");
          }
          break;
        case "content-type-cache":
          const contentTypes2 = await editor.getContentTypeCache(user);
          ctx.body = contentTypes2;
          break;
        case "content-hub-metadata-cache":
          // Return content hub metadata for filtering (levels, languages, licenses, disciplines)
          try {
            if (editor.contentHubService && typeof editor.contentHubService.getMetadata === 'function') {
              const metadata = await editor.contentHubService.getMetadata();
              ctx.body = metadata;
            } else {
              // Provide default metadata structure if service is not available
              ctx.body = {
                levels: [],
                languages: [],
                licenses: [],
                disciplines: []
              };
            }
          } catch (metadataError) {
            strapi.log.warn("Could not fetch content hub metadata:", metadataError.message);
            ctx.body = { levels: [], languages: [], licenses: [], disciplines: [] };
          }
          break;
        default:
          ctx.throw(400, `Unknown action: ${action}`);
      }
    } catch (error) {
      strapi.log.error("H5P AJAX error:", error);
      ctx.throw(500, error);
    }
  },
  /**
   * Get content parameters
   */
  async getContentParameters(ctx) {
    try {
      const { contentId } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const editor = h5pService.getEditor();
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: contentId
      });
      if (!content2) {
        ctx.throw(404, "Content not found");
      }
      ctx.body = {
        params: content2.h5pContent?.params || {},
        metadata: content2.h5pContent?.metadata || {},
        library: content2.h5pContent?.library || ""
      };
    } catch (error) {
      strapi.log.error("Error getting content parameters:", error);
      ctx.throw(500, error);
    }
  },
  /**
   * Get editor library data
   */
  async getEditorLibrary(ctx) {
    try {
      const { ubername, majorVersion, minorVersion } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const editor = h5pService.getEditor();
      const libraryData = await editor.getLibraryData(
        `${ubername} ${majorVersion}.${minorVersion}`
      );
      ctx.body = libraryData;
    } catch (error) {
      strapi.log.error("Error getting editor library:", error);
      ctx.throw(500, error);
    }
  },
  /**
   * Get library file
   */
  async getLibraryFile(ctx) {
    try {
      const { ubername, file } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const editor = h5pService.getEditor();
      const libraryPath = await editor.libraryStorage.getLibraryPath({
        machineName: ubername.split("-")[0],
        majorVersion: parseInt(ubername.split("-")[1]),
        minorVersion: parseInt(ubername.split("-")[2])
      });
      const filePath = `${libraryPath}/${file}`;
      const ext = file.split(".").pop();
      const contentTypes2 = {
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg"
      };
      ctx.type = contentTypes2[ext] || "application/octet-stream";
      ctx.body = await strapi.plugin("h5p").service("service").readFile(filePath);
    } catch (error) {
      strapi.log.error("Error getting library file:", error);
      ctx.throw(404, "File not found");
    }
  },
  /**
   * Get content file
   */
  async getContentFile(ctx) {
    try {
      const { contentId, file } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const player = h5pService.getPlayer();
      const contentPath = await player.contentStorage.getContentPath(contentId);
      const filePath = `${contentPath}/${file}`;
      const ext = file.split(".").pop();
      const contentTypes2 = {
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg"
      };
      ctx.type = contentTypes2[ext] || "application/octet-stream";
      ctx.body = await strapi.plugin("h5p").service("service").readFile(filePath);
    } catch (error) {
      strapi.log.error("Error getting content file:", error);
      ctx.throw(404, "File not found");
    }
  },
  /**
   * Download content as .h5p file
   */
  async downloadContent(ctx) {
    try {
      const { contentId } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const editor = h5pService.getEditor();
      const user = {
        id: ctx.state.user?.id || "1",
        name: ctx.state.user?.username || "anonymous",
        type: "local"
      };
      const h5pFile = await editor.exportContent(contentId, user);
      ctx.attachment(`${contentId}.h5p`);
      ctx.type = "application/zip";
      ctx.body = h5pFile;
    } catch (error) {
      strapi.log.error("Error downloading content:", error);
      ctx.throw(500, error);
    }
  },
  /**
   * Play content (render player)
   */
  async playContent(ctx) {
    try {
      const { contentId } = ctx.params;
      const h5pService = strapi.plugin("h5p").service("service");
      const player = h5pService.getPlayer();
      const user = {
        id: ctx.state.user?.id || "1",
        name: ctx.state.user?.username || "anonymous",
        type: "local"
      };
      const content2 = await strapi.documents("api::h5p-content.h5p-content").findOne({
        documentId: contentId
      });
      if (!content2) {
        ctx.throw(404, "Content not found");
      }
      const h5pObject = await player.render(contentId, user);
      ctx.body = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${content2.title}</title>
          ${h5pObject.styles.map((style) => `<link rel="stylesheet" href="${style}">`).join("\n")}
          ${h5pObject.scripts.map((script) => `<script src="${script}"><\/script>`).join("\n")}
        </head>
        <body>
          <div id="h5p-container">${h5pObject.html}</div>
        </body>
        </html>
      `;
    } catch (error) {
      strapi.log.error("Error playing content:", error);
      ctx.throw(500, error);
    }
  }
});
const controllers = {
  controller,
  h5pEditorController
};
const middlewares = {};
const policies = {};
const contentAPIRoutes = [
  // Content routes
  {
    method: "GET",
    path: "/content",
    handler: "controller.findContent",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "GET",
    path: "/content/:id",
    handler: "controller.findOneContent",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "POST",
    path: "/content",
    handler: "controller.createContent",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "PUT",
    path: "/content/:id",
    handler: "controller.updateContent",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "DELETE",
    path: "/content/:id",
    handler: "controller.deleteContent",
    config: {
      policies: [],
      auth: false
    }
  },
  // Rendering and embed routes
  {
    method: "GET",
    path: "/content/:id/play",
    handler: "controller.playContent",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "GET",
    path: "/content/:id/embed",
    handler: "controller.getEmbedCode",
    config: {
      policies: [],
      auth: false
    }
  }
];
const adminAPIRoutes = [
  {
    method: "GET",
    path: "/libraries",
    handler: "controller.getLibraries",
    config: {
      policies: []
    }
  },
  {
    method: "GET",
    path: "/libraries/available",
    handler: "controller.getAvailableLibraries",
    config: {
      policies: []
    }
  },
  {
    method: "POST",
    path: "/libraries/install",
    handler: "controller.installLibrary",
    config: {
      policies: []
    }
  },
  {
    method: "POST",
    path: "/libraries/upload",
    handler: "controller.uploadLibrary",
    config: {
      policies: []
    }
  }
];
const editorAPIRoutes = [
  {
    method: "GET",
    path: "/editor/new",
    handler: "controller.getEditorNew",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "GET",
    path: "/editor/:id",
    handler: "controller.getEditorEdit",
    config: {
      policies: [],
      auth: false
    }
  },
  {
    method: "POST",
    path: "/editor/save",
    handler: "controller.saveEditorContent",
    config: {
      policies: [],
      auth: false
    }
  }
];
const h5pEditorRoutes = [
  // Get editor page (full HTML page)
  {
    method: "GET",
    path: "/editor-page/:contentId",
    handler: "h5pEditorController.getEditorPage",
    config: {
      policies: [],
      auth: false
    }
  },
  // Serve H5P core assets (CSS/JS)
  {
    method: "GET",
    path: "/core/:type/:file*",
    handler: "h5pEditorController.serveCoreAsset",
    config: {
      policies: [],
      auth: false
    }
  },
  // Serve H5P editor assets
  {
    method: "GET",
    path: "/editor/:type/:file*",
    handler: "h5pEditorController.serveEditorAsset",
    config: {
      policies: [],
      auth: false
    }
  },
  // Get editor content (POST for write operations)
  {
    method: "POST",
    path: "/ajax",
    handler: "h5pEditorController.ajax",
    config: {
      policies: [],
      auth: false
      // H5P editor needs unauthenticated access for some requests
    }
  },
  // Get editor content (GET for read operations like content-type-cache)
  {
    method: "GET",
    path: "/ajax",
    handler: "h5pEditorController.ajax",
    config: {
      policies: [],
      auth: false
    }
  },
  // Get content parameters
  {
    method: "GET",
    path: "/params/:contentId",
    handler: "h5pEditorController.getContentParameters",
    config: {
      policies: []
    }
  },
  // Get editor library data
  {
    method: "GET",
    path: "/editor/:ubername/:majorVersion/:minorVersion",
    handler: "h5pEditorController.getEditorLibrary",
    config: {
      policies: []
    }
  },
  // Get library file
  {
    method: "GET",
    path: "/libraries/:ubername/:file*",
    handler: "h5pEditorController.getLibraryFile",
    config: {
      policies: [],
      auth: false
    }
  },
  // Get content file
  {
    method: "GET",
    path: "/content/:contentId/:file*",
    handler: "h5pEditorController.getContentFile",
    config: {
      policies: [],
      auth: false
    }
  },
  // Download content
  {
    method: "GET",
    path: "/download/:contentId",
    handler: "h5pEditorController.downloadContent",
    config: {
      policies: []
    }
  },
  // Play content
  {
    method: "GET",
    path: "/play/:contentId",
    handler: "h5pEditorController.playContent",
    config: {
      policies: []
    }
  }
];
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentAPIRoutes
  },
  admin: {
    type: "admin",
    routes: adminAPIRoutes
  },
  "editor-api": {
    type: "content-api",
    routes: editorAPIRoutes
  },
  "h5p-editor": {
    type: "content-api",
    routes: h5pEditorRoutes
  }
};
const service = ({ strapi }) => ({
  h5pEditor: null,
  h5pPlayer: null,
  h5pConfig: null,
  /**
   * Initialize H5P Editor and Player
   */
  async initialize() {
    if (this.h5pEditor && this.h5pPlayer) {
      return { editor: this.h5pEditor, player: this.h5pPlayer };
    }
    try {
      const h5pPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p");
      await fs__default.default.ensureDir(path__default.default.join(h5pPath, "content"));
      await fs__default.default.ensureDir(path__default.default.join(h5pPath, "libraries"));
      await fs__default.default.ensureDir(path__default.default.join(h5pPath, "temp"));
      const baseUrl = strapi.config.get("server.url") || "http://localhost:1337";
      this.h5pConfig = new h5pServer.H5PConfig(void 0, {
        baseUrl: baseUrl,
        contentHubEnabled: true,
        coreUrl: `/api/h5p/core`,
        editorLibraryUrl: `/api/h5p/editor`,
        librariesUrl: `/api/h5p/libraries`,
        contentUrl: `/api/h5p/content`,
        ajaxUrl: `/api/h5p/ajax`
      });
      const contentStorage = new h5pServer.fsImplementations.FileContentStorage(
        path__default.default.join(h5pPath, "content")
      );
      const libraryStorage = new h5pServer.fsImplementations.FileLibraryStorage(
        path__default.default.join(h5pPath, "libraries")
      );
      const temporaryStorage = new h5pServer.fsImplementations.DirectoryTemporaryFileStorage(
        path__default.default.join(h5pPath, "temp")
      );
      const cache = new h5pServer.cacheImplementations.CachedKeyValueStorage("memory");
      this.h5pEditor = new h5pServer.H5PEditor(
        cache,
        this.h5pConfig,
        libraryStorage,
        contentStorage,
        temporaryStorage
      );
      this.h5pPlayer = new h5pServer.H5PPlayer(libraryStorage, contentStorage, this.h5pConfig);
      strapi.log.info("✅ H5P Editor and Player initialized successfully");
      return { editor: this.h5pEditor, player: this.h5pPlayer };
    } catch (error) {
      strapi.log.error("❌ Failed to initialize H5P:", error);
      throw error;
    }
  },
  /**
   * Get H5P Editor instance
   */
  getEditor() {
    if (!this.h5pEditor) {
      throw new Error("H5P Editor not initialized. Call initialize() first.");
    }
    return this.h5pEditor;
  },
  /**
   * Get H5P Player instance
   */
  getPlayer() {
    if (!this.h5pPlayer) {
      throw new Error("H5P Player not initialized. Call initialize() first.");
    }
    return this.h5pPlayer;
  },
  /**
   * Get installed H5P libraries
   */
  async getInstalledLibraries() {
    const librariesPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p", "libraries");
    try {
      await fs__default.default.ensureDir(librariesPath);
      const libraries = await fs__default.default.readdir(librariesPath);
      const libraryDetails = await Promise.all(
        libraries.map(async (lib) => {
          const libraryJsonPath = path__default.default.join(librariesPath, lib, "library.json");
          try {
            const libraryJson = await fs__default.default.readJson(libraryJsonPath);
            return {
              name: lib,
              machineName: libraryJson.machineName || lib,
              title: libraryJson.title || lib,
              majorVersion: libraryJson.majorVersion || 1,
              minorVersion: libraryJson.minorVersion || 0,
              patchVersion: libraryJson.patchVersion || 0,
              path: path__default.default.join(librariesPath, lib)
            };
          } catch (error) {
            return {
              name: lib,
              machineName: lib,
              title: lib,
              path: path__default.default.join(librariesPath, lib)
            };
          }
        })
      );
      return libraryDetails;
    } catch (error) {
      strapi.log.error("Failed to get libraries:", error);
      return [];
    }
  },
  /**
   * Download file from URL
   */
  async downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https__default.default : http__default.default;
      const file = fs__default.default.createWriteStream(dest);
      protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs__default.default.unlinkSync(dest);
          return this.downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs__default.default.unlinkSync(dest);
          return reject(new Error(`Failed to download: ${response.statusCode}`));
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        fs__default.default.unlinkSync(dest);
        reject(err);
      });
      file.on("error", (err) => {
        fs__default.default.unlinkSync(dest);
        reject(err);
      });
    });
  },
  /**
   * Get available libraries from H5P Hub
   */
  async getAvailableLibraries() {
    try {
      const response = await fetch("https://h5p.org/h5p-php-library/libraries.json", {
        headers: {
          Accept: "application/json",
          "User-Agent": "Strapi-H5P/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`H5P Hub API error: ${response.statusText}`);
      }
      const data = await response.json();
      const libraries = Array.isArray(data) ? data : data.contentTypes || data.libraries || [];
      return libraries.map((lib) => ({
        id: lib.id || lib.machineName,
        machineName: lib.machineName || lib.machine_name || lib.id,
        title: lib.title || lib.name,
        description: lib.description || lib.summary || "",
        majorVersion: lib.majorVersion || lib.major_version || 1,
        minorVersion: lib.minorVersion || lib.minor_version || 0,
        patchVersion: lib.patchVersion || lib.patch_version || 0,
        downloadUrl: lib.downloadUrl || lib.download_url,
        icon: lib.icon,
        screenshots: lib.screenshots || [],
        license: lib.license,
        owner: lib.owner
      }));
    } catch (error) {
      strapi.log.error("Failed to fetch from H5P Hub:", error);
      return [
        {
          machineName: "H5P.InteractiveVideo",
          title: "Interactive Video",
          description: "Create videos enriched with interactions",
          majorVersion: 1,
          minorVersion: 22,
          patchVersion: 0
        },
        {
          machineName: "H5P.QuestionSet",
          title: "Question Set",
          description: "Create a sequence of various question types",
          majorVersion: 1,
          minorVersion: 17,
          patchVersion: 0
        },
        {
          machineName: "H5P.CoursePresentation",
          title: "Course Presentation",
          description: "Create a presentation with interactive slides",
          majorVersion: 1,
          minorVersion: 24,
          patchVersion: 0
        }
      ];
    }
  },
  /**
   * Install library from H5P Hub
   */
  async installLibrary(libraryName, version) {
    try {
      strapi.log.info(`Installing H5P library: ${libraryName}`);
      const librariesPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p", "libraries");
      const tempPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p", "temp");
      await fs__default.default.ensureDir(librariesPath);
      await fs__default.default.ensureDir(tempPath);
      const availableLibraries = await this.getAvailableLibraries();
      const libraryInfo = availableLibraries.find((lib) => lib.machineName === libraryName);
      if (!libraryInfo) {
        throw new Error(`Library ${libraryName} not found in H5P Hub`);
      }
      const versionStr = version || `${libraryInfo.majorVersion}.${libraryInfo.minorVersion}`;
      const downloadUrl = libraryInfo.downloadUrl || `https://api.h5p.org/v1/content-types/${libraryInfo.id || libraryName}/download?version=${versionStr}`;
      strapi.log.info(`Downloading from: ${downloadUrl}`);
      const tempFile = path__default.default.join(tempPath, `${libraryName}-${Date.now()}.h5p`);
      await this.downloadFile(downloadUrl, tempFile);
      const zip = new AdmZip__default.default(tempFile);
      const libraryPath = path__default.default.join(librariesPath, libraryName);
      if (await fs__default.default.pathExists(libraryPath)) {
        await fs__default.default.remove(libraryPath);
      }
      await fs__default.default.ensureDir(libraryPath);
      zip.extractAllTo(libraryPath, true);
      await fs__default.default.remove(tempFile);
      const libraryJsonPath = path__default.default.join(libraryPath, "library.json");
      let installedVersion = versionStr;
      if (await fs__default.default.pathExists(libraryJsonPath)) {
        const libraryJson = await fs__default.default.readJson(libraryJsonPath);
        installedVersion = `${libraryJson.majorVersion}.${libraryJson.minorVersion}.${libraryJson.patchVersion}`;
      }
      strapi.log.info(`Successfully installed ${libraryName} v${installedVersion}`);
      return {
        success: true,
        library: libraryName,
        version: installedVersion,
        message: `Successfully installed ${libraryName} v${installedVersion}`
      };
    } catch (error) {
      strapi.log.error("Failed to install library:", error);
      throw error;
    }
  },
  /**
   * Upload and install library from .h5p package file
   */
  async uploadLibraryPackage(file) {
    try {
      strapi.log.info(`Uploading H5P library package: ${file.name}`);
      const librariesPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p", "libraries");
      const tempPath = path__default.default.join(strapi.dirs.static.public, "uploads", "h5p", "temp");
      await fs__default.default.ensureDir(librariesPath);
      await fs__default.default.ensureDir(tempPath);
      const tempFile = path__default.default.join(tempPath, `upload-${Date.now()}.h5p`);
      await fs__default.default.move(file.path, tempFile);
      const zip = new AdmZip__default.default(tempFile);
      const libraryJsonEntry = zip.getEntry("library.json");
      if (!libraryJsonEntry) {
        throw new Error("Invalid H5P package: library.json not found");
      }
      const libraryJson = JSON.parse(libraryJsonEntry.getData().toString("utf8"));
      const libraryName = libraryJson.machineName;
      if (!libraryName) {
        throw new Error("Invalid H5P package: machineName not found in library.json");
      }
      const libraryPath = path__default.default.join(librariesPath, libraryName);
      if (await fs__default.default.pathExists(libraryPath)) {
        await fs__default.default.remove(libraryPath);
      }
      await fs__default.default.ensureDir(libraryPath);
      zip.extractAllTo(libraryPath, true);
      await fs__default.default.remove(tempFile);
      const installedVersion = `${libraryJson.majorVersion}.${libraryJson.minorVersion}.${libraryJson.patchVersion}`;
      strapi.log.info(`Successfully uploaded ${libraryName} v${installedVersion}`);
      return {
        success: true,
        library: libraryName,
        version: installedVersion,
        message: `Successfully uploaded ${libraryName} v${installedVersion}`
      };
    } catch (error) {
      strapi.log.error("Failed to upload library:", error);
      throw error;
    }
  },
  /**
   * Render H5P content as HTML
   */
  async renderContent(content2) {
    try {
      const { title, library, parameters, metadata } = content2;
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/h5p-standalone@3.5.1/dist/styles/h5p.css">
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      }
      .h5p-container {
        max-width: 1200px;
        margin: 0 auto;
      }
    </style>
</head>
<body>
    <div class="h5p-container">
        <h1>${title}</h1>
        <div id="h5p-container"></div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/h5p-standalone@3.5.1/dist/main.bundle.js"><\/script>
    <script>
      const el = document.getElementById('h5p-container');
      const options = {
        h5pJsonPath: '${strapi.config.get("server.url")}/uploads/h5p/content/${content2.slug}',
        frameJs: 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.5.1/dist/frame.bundle.js',
        frameCss: 'https://cdn.jsdelivr.net/npm/h5p-standalone@3.5.1/dist/styles/h5p.css',
      };
      
      // For now, display the content info
      el.innerHTML = \`
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
          <h2>H5P Content Preview</h2>
          <p><strong>Library:</strong> ${library}</p>
          <p><strong>Parameters:</strong></p>
          <pre style="background: white; padding: 10px; overflow: auto;">${JSON.stringify(parameters, null, 2)}</pre>
          <p><strong>Metadata:</strong></p>
          <pre style="background: white; padding: 10px; overflow: auto;">${JSON.stringify(metadata, null, 2)}</pre>
          <p style="margin-top: 20px; color: #666;">
            <em>Full H5P player integration requires proper H5P library files and player configuration.</em>
          </p>
        </div>
      \`;
    <\/script>
</body>
</html>
      `;
      return html;
    } catch (error) {
      strapi.log.error("Failed to render content:", error);
      throw error;
    }
  },
  /**
   * Render H5P Editor interface
   */
  async renderEditor(contentId) {
    try {
      const editor = this.getEditor();
      const user = {
        id: "1",
        name: "admin",
        canUpdateAndInstallLibraries: true,
        canInstallRecommended: true,
        canCreateRestricted: true,
        type: "local"
      };

      const baseUrl = strapi.config.get("server.url") || "http://localhost:1337";

      // Get the original HTML to extract CSS and JS URLs
      const originalHtml = await editor.render(
        contentId && contentId !== "new" ? contentId : undefined,
        "en",
        user
      );

      // Extract CSS and JS URLs from the original HTML
      const cssMatches = originalHtml.match(/href="([^"]+\.css[^"]*)"/g) || [];
      const jsMatches = originalHtml.match(/src="([^"]+\.js[^"]*)"/g) || [];

      const cssFiles = cssMatches
        .map(m => m.match(/href="([^"]+)"/)?.[1])
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

      const jsFiles = jsMatches
        .map(m => m.match(/src="([^"]+)"/)?.[1])
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

      // Build H5PIntegration
      const h5pIntegration = {
        baseUrl: baseUrl,
        url: baseUrl,
        postUserStatistics: false,
        ajax: {
          setFinished: `${baseUrl}/api/h5p/ajax?action=setFinished`,
          contentUserData: `${baseUrl}/api/h5p/ajax?action=contentUserData`
        },
        ajaxPath: `${baseUrl}/api/h5p/ajax?action=`,
        saveFreq: false,
        l10n: { H5P: {} },
        hubIsEnabled: true,
        fullscreenDisabled: 0,
        editor: {
          filesPath: `${baseUrl}/api/h5p/temp-files`,
          fileIcon: { path: `${baseUrl}/api/h5p/editor/images/binary-file.png`, width: 50, height: 50 },
          ajaxPath: `${baseUrl}/api/h5p/ajax?action=`,
          libraryUrl: `${baseUrl}/api/h5p/editor/`,
          copyrightSemantics: {},
          metadataSemantics: [],
          assets: { css: cssFiles, js: jsFiles },
          apiVersion: { majorVersion: 1, minorVersion: 27 },
          enableContentHub: false
        },
        user: { name: "admin", id: "1" },
        contents: {}
      };

      const cssLinks = cssFiles.map(css => `<link rel="stylesheet" href="${css}">`).join('\n    ');

      // Find the jQuery URL from jsFiles
      const jqueryUrl = jsFiles.find(s => s.indexOf('jquery.js') !== -1) || '/api/h5p/core/js/jquery.js';

      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>H5P Editor</title>
    ${cssLinks}
    <style>
      body { margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .h5p-editor-wrapper { width: 100%; max-width: 100%; }
      /* Force H5P Hub to full width */
      .h5p-hub-client-container-using-mouse,
      .h5p-hub,
      .h5p-hub-panel,
      .h5p-hub-panel-body,
      .h5p-hub-content-types-section,
      .h5p-hub-content-type-list,
      .h5p-hub-tab-panel,
      .h5p-hub-content-types,
      .content-type-list,
      .h5peditor { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      /* Content type items in grid */
      .h5p-hub-content-type-list ul { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; gap: 16px !important; width: 100% !important; }
      .h5p-hub-content-type-list li { width: 100% !important; max-width: 100% !important; }
    </style>
</head>
<body>
    <div class="h5p-editor-wrapper">
      <div class="h5p-create">
        <div class="h5p-editor"></div>
      </div>
    </div>

    <script>
      // Setup H5PIntegration first
      window.H5PIntegration = ${JSON.stringify(h5pIntegration)};
      window.H5P = window.H5P || {};
      window.H5PEditor = window.H5PEditor || {};
      window.H5PEditor.language = { core: {} };
      window.H5PEditor.widgets = {};

      // Load jQuery first, then set H5P.jQuery, then load remaining scripts
      var allScripts = ${JSON.stringify(jsFiles)}.filter(function(s) {
        // Keep h5peditor-editor.js but skip h5peditor.js (the one without -editor)
        if (s.indexOf('h5peditor.js') !== -1 && s.indexOf('h5peditor-editor.js') === -1) {
          console.log('Skipping h5peditor.js (iframe-only script)');
          return false;
        }
        return true;
      });
      var loadedCount = 0;

      function loadScriptSequentially() {
        if (loadedCount >= allScripts.length) {
          console.log('All scripts loaded, initializing H5P Editor');

          // Verify jQuery is available (H5P's jQuery sets H5P.jQuery, not window.jQuery)
          var jq = window.H5P.jQuery || window.jQuery;
          if (typeof jq === 'function') {
            window.H5P.jQuery = jq;
            window.H5PEditor.$ = jq;
            H5PEditor.$ = jq;
            window.jQuery = window.jQuery || jq; // Also set window.jQuery for compatibility
            window.$ = window.$ || jq;
            console.log('H5P.jQuery confirmed available');
          } else {
            console.error('jQuery not available! H5P jQuery may have failed to initialize.');
            return;
          }

          // Initialize H5PEditor properties from H5PIntegration (required before creating Editor)
          var editorConfig = window.H5PIntegration.editor || {};
          H5PEditor.basePath = editorConfig.libraryUrl || '';
          H5PEditor.fileIcon = editorConfig.fileIcon || {};
          H5PEditor.ajaxPath = editorConfig.ajaxPath || '';
          H5PEditor.filesPath = editorConfig.filesPath || '';
          H5PEditor.apiVersion = editorConfig.apiVersion || { majorVersion: 1, minorVersion: 24 };
          H5PEditor.contentLanguage = editorConfig.language || 'en';
          H5PEditor.copyrightSemantics = editorConfig.copyrightSemantics || {};
          H5PEditor.metadataSemantics = editorConfig.metadataSemantics || [];
          H5PEditor.assets = editorConfig.assets || { css: [], js: [] };
          H5PEditor.baseUrl = window.H5PIntegration.baseUrl || '';
          H5PEditor.enableContentHub = editorConfig.enableContentHub || false;

          // Define getAjaxUrl function (normally in h5peditor-init.js, but we need it here for the iframe)
          H5PEditor.getAjaxUrl = function (action, parameters) {
            var url = window.H5PIntegration.editor.ajaxPath + action;
            if (parameters !== undefined) {
              var separator = url.indexOf('?') === -1 ? '?' : '&';
              for (var property in parameters) {
                if (parameters.hasOwnProperty(property)) {
                  url += separator + property + '=' + parameters[property];
                  separator = '&';
                }
              }
            }
            return url;
          };

          console.log('H5PEditor properties initialized:', {
            basePath: H5PEditor.basePath,
            ajaxPath: H5PEditor.ajaxPath,
            assetsCSS: H5PEditor.assets.css.length,
            assetsJS: H5PEditor.assets.js.length
          });

          // Initialize the H5P Editor properly
          try {
            // Get the editor container
            var editorContainer = document.querySelector('.h5p-editor');
            if (!editorContainer) {
              console.error('Editor container .h5p-editor not found');
              return;
            }

            // For new content, library and params are empty
            var library = '';
            var defaultParams = '{}';

            console.log('Creating H5PEditor.Editor instance...');

            // Create the editor instance
            // The Editor constructor expects: (library, defaultParams, replaceElement, iframeLoaded)
            window.h5peditor = new H5PEditor.Editor(library, defaultParams, editorContainer, function() {
              console.log('H5P Editor iframe loaded');
            });

            console.log('H5P Editor instance created');

          } catch (e) {
            console.error('Error initializing H5P Editor:', e.message);
            console.error(e.stack);
          }

          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'h5p-editor-loaded' }, '*');
          }
          return;
        }

        var script = document.createElement('script');
        var currentScript = allScripts[loadedCount];
        script.src = currentScript + '&cacheBust=' + Date.now();
        script.onload = function() {
          console.log('Loaded: ' + currentScript);
          // After jQuery loads, ensure H5P.jQuery is available
          // H5P's jQuery sets H5P.jQuery directly, not window.jQuery
          if (currentScript.indexOf('jquery.js') !== -1) {
            var jq = window.H5P.jQuery || window.jQuery;
            if (typeof jq === 'function') {
              window.H5P.jQuery = jq;
              window.H5PEditor.$ = jq;
              window.jQuery = window.jQuery || jq;
              window.$ = window.$ || jq;
              console.log('H5P.jQuery set after jQuery loaded');
            }
          }
          loadedCount++;
          loadScriptSequentially();
        };
        script.onerror = function() {
          console.error('Failed to load: ' + allScripts[loadedCount]);
          loadedCount++;
          loadScriptSequentially();
        };
        document.body.appendChild(script);
      }

      // Start loading scripts
      console.log('Starting script loading, total:', allScripts.length);
      loadScriptSequentially();
    <\/script>
</body>
</html>`;
    } catch (error) {
      strapi.log.error("Failed to render H5P editor:", error);
      throw error;
    }
  },
  /**
   * Read file from filesystem
   */
  async readFile(filePath) {
    try {
      return await fs__default.default.readFile(filePath);
    } catch (error) {
      strapi.log.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }
});
const services = {
  service
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes: {}, // Disabled - using content-type from src/api/h5p-content
  policies,
  middlewares
};
module.exports = index;
