import path from "node:path";
import fs from "fs-extra";
import "node:https";
import "node:http";
import type { Context } from "koa";
import type { EditorRenderModel } from "./renderers/editor";
import AdmZip from "adm-zip";
import * as h5pServer from "@lumieducation/h5p-server";
import { renderEditorPage } from "./renderers/editor";
type StrapiContext = Context & {
  request: Context["request"] & {
    body?: any;
    files?: any;
  };
};

type H5PUser = {
  id: string;
  name: string;
  email: string;
  type: "local" | string;
};

type H5PConfigState = {
  baseUrl: string;
  editorUrl: string;
  coreUrl: string;
  contentTypeCacheUrl: string;
  contentHubMetadataUrl: string;
  contentStorage: {
    libraryPath: string;
    contentPath: string;
    temporaryPath: string;
  };
};

type HandleAjaxArgs = {
  action?: string | string[];
  query?: Record<string, any>;
  user?: H5PUser | null;
  method?: string;
  body?: any;
  files?: any;
};

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Internal Server Error";

const bootstrap = async ({ strapi }: { strapi: any }) => {
  const h5pService = strapi.plugin("h5p").service("service");
  await h5pService.initialize();
  strapi.log.info("H5P plugin bootstrapped");
};
const destroy = ({ strapi }: { strapi: any }) => {};
const register = ({ strapi }: { strapi: any }) => {
  strapi.customFields.register({
    name: "h5p-editor",
    plugin: "h5p",
    type: "json",
    // Store H5P content as JSON
  });
};
const config = {
  default: {},
  validator() {},
};
const controller = ({ strapi }: { strapi: any }) => ({
  // Content methods
  async findContent(ctx: StrapiContext) {
    try {
      const contents = await strapi
        .documents("api::h5p-content.h5p-content")
        .findMany({
          ...ctx.query,
        });
      ctx.body = contents;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async findOneContent(ctx: StrapiContext) {
    const { id } = ctx.params;
    try {
      const content2 = await strapi
        .documents("api::h5p-content.h5p-content")
        .findOne({
          documentId: id,
          ...ctx.query,
        });
      ctx.body = content2;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async createContent(ctx: StrapiContext) {
    try {
      const { title, library, parameters, metadata } = ctx.request.body;
      const slug = title
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(^-|-$)/g, "");
      const embedCode = `<iframe src="${strapi.config.get("server.url")}/api/h5p/content/${slug}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
      const newContent = await strapi
        .documents("api::h5p-content.h5p-content")
        .create({
          data: {
            title,
            slug,
            library,
            parameters,
            metadata,
            embedCode,
          },
        });
      ctx.body = newContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContent(ctx: StrapiContext) {
    const { id } = ctx.params;
    try {
      const updatedContent = await strapi
        .documents("api::h5p-content.h5p-content")
        .update({
          documentId: id,
          data: ctx.request.body,
        });
      ctx.body = updatedContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async deleteContent(ctx: StrapiContext) {
    const { id } = ctx.params;
    try {
      const deletedContent = await strapi
        .documents("api::h5p-content.h5p-content")
        .delete({
          documentId: id,
        });
      ctx.body = deletedContent;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  // Library methods
  async getLibraries(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getInstalledLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getAvailableLibraries(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const libraries = await h5pService.getAvailableLibraries();
      ctx.body = libraries;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async installLibrary(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const { id } = ctx.request.body;
      const result = await h5pService.installLibrary(id);
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentTypeCache(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.getContentTypeCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContentTypeCache(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.updateContentTypeCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentHubMetadataCache(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.getContentHubMetadataCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async updateContentHubMetadataCache(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const cache = await h5pService.updateContentHubMetadataCache();
      ctx.body = cache;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  // Editor methods
  async getEditorPage(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderEditor(
        ctx.params.contentId,
        ctx.state?.user,
      );
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentParams(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const params = await h5pService.getContentParams(ctx.params.contentId);
      ctx.body = params;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async saveContent(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const result = await h5pService.saveContent(
        ctx.request.body,
        ctx.state?.user,
      );
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getLibraryFile(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getLibraryFile(
        ctx.params.ubername,
        ctx.params.file,
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getContentFile(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getContentFile(
        ctx.params.contentId,
        ctx.params.file,
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getCoreFile(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getCoreFile(
        ctx.params.type,
        ctx.params.file,
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getEditorFile(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const file = await h5pService.getEditorFile(
        ctx.params.type,
        ctx.params.file,
      );
      ctx.type = file.mimeType;
      ctx.body = file.stream;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getPlayPage(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const html = await h5pService.renderPlayer(ctx.params.contentId);
      ctx.type = "text/html";
      ctx.body = html;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async getAjax(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const action =
        ctx.query.action || (ctx.request.body && ctx.request.body.action);
      const result = await h5pService.handleAjax({
        action,
        query: ctx.query,
        user: ctx.state?.user,
        method: ctx.method,
        body: ctx.request.body,
        files: ctx.request.files,
      });
      if (result && result.body !== void 0) {
        if (result.contentType) {
          ctx.type = result.contentType;
        }
        if (result.status) {
          ctx.status = result.status;
        }
        ctx.body = result.body;
      } else {
        ctx.body = result;
      }
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
});
const controllers = {
  controller,
};

const routes = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "GET",
        path: "/contents",
        handler: "controller.findContent",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/contents/:id",
        handler: "controller.findOneContent",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/contents",
        handler: "controller.createContent",
        config: {
          auth: false,
        },
      },
      {
        method: "PUT",
        path: "/contents/:id",
        handler: "controller.updateContent",
        config: {
          auth: false,
        },
      },
      {
        method: "DELETE",
        path: "/contents/:id",
        handler: "controller.deleteContent",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/libraries",
        handler: "controller.getLibraries",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/libraries/available",
        handler: "controller.getAvailableLibraries",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/libraries/install",
        handler: "controller.installLibrary",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/ajax",
        handler: "controller.getAjax",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/ajax",
        handler: "controller.getAjax",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/editor-page/:contentId",
        handler: "controller.getEditorPage",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/params/:contentId",
        handler: "controller.getContentParams",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/save",
        handler: "controller.saveContent",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/libraries/:ubername/:file*",
        handler: "controller.getLibraryFile",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/content/:contentId/:file*",
        handler: "controller.getContentFile",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/core/:type/:file*",
        handler: "controller.getCoreFile",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/editor/:type/:file*",
        handler: "controller.getEditorFile",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/play/:contentId",
        handler: "controller.getPlayPage",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/content-type-cache",
        handler: "controller.getContentTypeCache",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/content-type-cache",
        handler: "controller.updateContentTypeCache",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/content-hub-metadata-cache",
        handler: "controller.getContentHubMetadataCache",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/content-hub-metadata-cache",
        handler: "controller.updateContentHubMetadataCache",
        config: {
          auth: false,
        },
      },
    ],
  },
};
const policies = {};
const middlewares = {};
const service = ({ strapi }: { strapi: any }) => {
  const state: {
    h5pConfig: H5PConfigState | null;
    h5pEditor: any | null;
    h5pPlayer: any | null;
    currentRenderContentId: string | null;
  } = {
    h5pConfig: null,
    h5pEditor: null,
    h5pPlayer: null,
    currentRenderContentId: null,
  };

  const getConfig = (): H5PConfigState => {
    if (!state.h5pConfig) {
      throw new Error("H5P config not initialized");
    }
    return state.h5pConfig;
  };

  const getEditor = (): any => {
    if (!state.h5pEditor) {
      throw new Error("H5P editor not initialized");
    }
    return state.h5pEditor;
  };

  const getPlayer = (): any => {
    if (!state.h5pPlayer) {
      throw new Error("H5P player not initialized");
    }
    return state.h5pPlayer;
  };

  const resolveUser = (user?: H5PUser | null): H5PUser =>
    user || {
      id: "anonymous",
      name: "Anonymous",
      email: "anonymous@example.com",
      type: "local",
    };

  const getMimeType = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".js":
        return "application/javascript";
      case ".css":
        return "text/css";
      case ".json":
        return "application/json";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".svg":
        return "image/svg+xml";
      case ".woff":
        return "font/woff";
      case ".woff2":
        return "font/woff2";
      case ".ttf":
        return "font/ttf";
      case ".eot":
        return "application/vnd.ms-fontobject";
      case ".otf":
        return "font/otf";
      case ".mp4":
        return "video/mp4";
      case ".webm":
        return "video/webm";
      case ".ogg":
        return "audio/ogg";
      case ".mp3":
        return "audio/mpeg";
      case ".wav":
        return "audio/wav";
      default:
        return "application/octet-stream";
    }
  };

  return {
  /**
   * H5P Editor and Player Implementation
   * This is a custom implementation to make H5P work with Strapi (Koa)
   */
  async initialize(): Promise<void> {
    strapi.log.info("Initializing H5P Editor and Player...");
    const config2 = strapi.config.get("plugin.h5p") || {};
    const pluginConfig = config2.config || {};
    const baseUrl = "/api/h5p";
    const h5pConfig = new h5pServer.H5PConfig(void 0, {
      baseUrl,
      contentHubEnabled: true,
    });
    const libraryPath = path.join(
      strapi.dirs.static.public,
      pluginConfig.librariesPath || "h5p/libraries",
    );
    const contentPath = path.join(
      strapi.dirs.static.public,
      pluginConfig.contentPath || "h5p/content",
    );
    const temporaryPath = path.join(
      strapi.dirs.static.public,
      pluginConfig.temporaryFilesPath || "h5p/temp-files",
    );
    state.h5pConfig = {
      baseUrl,
      editorUrl: `${baseUrl}${h5pConfig.editorLibraryUrl}`,
      coreUrl: `${baseUrl}${h5pConfig.coreUrl}`,
      contentTypeCacheUrl: `${baseUrl}/ajax?action=content-type-cache`,
      contentHubMetadataUrl: `${baseUrl}/ajax?action=content-hub-metadata-cache`,
      contentStorage: {
        libraryPath,
        contentPath,
        temporaryPath,
      },
    };
    // Ensure directories exist
    await fs.ensureDir(libraryPath);
    await fs.ensureDir(contentPath);
    await fs.ensureDir(temporaryPath);
    // Initialize H5P server
    const cache = new h5pServer.fsImplementations.InMemoryStorage();
    const libraryStorage = new h5pServer.fsImplementations.FileLibraryStorage(
      libraryPath,
    );
    const contentStorage = new h5pServer.fsImplementations.FileContentStorage(
      contentPath,
    );
    const temporaryStorage =
      new h5pServer.fsImplementations.DirectoryTemporaryFileStorage(
        temporaryPath,
      );
    state.h5pEditor = new h5pServer.H5PEditor(
      cache,
      h5pConfig,
      libraryStorage,
      contentStorage,
      temporaryStorage,
    );
    state.h5pEditor.setRenderer((model: EditorRenderModel) =>
      renderEditorPage(model, {
        saveEndpoint: `${baseUrl}/save`,
        paramsEndpoint: `${baseUrl}/params`,
        contentId: state.currentRenderContentId,
      }),
    );
    state.h5pPlayer = new h5pServer.H5PPlayer(
      libraryStorage,
      contentStorage,
      h5pConfig,
    );
    strapi.log.info("✅ H5P Editor and Player initialized successfully");
  },
  /**
   * Get installed libraries
   */
  async getInstalledLibraries(): Promise<any> {
    try {
      const libraries = await getEditor().libraryStorage.getInstalledLibraries();
      return libraries;
    } catch (error) {
      strapi.log.error("Failed to get installed libraries:", error);
      throw error;
    }
  },
  /**
   * Get available libraries from content hub
   */
  async getAvailableLibraries(): Promise<any> {
    try {
      const libraries = await getEditor().contentHub.getLibraries();
      return libraries;
    } catch (error) {
      strapi.log.error("Failed to get available libraries:", error);
      throw error;
    }
  },
  /**
   * Install library from content hub
   */
  async installLibrary(libraryId: string): Promise<any> {
    try {
      const result = await getEditor().contentHub.installLibrary(libraryId);
      return { success: true, result };
    } catch (error) {
      strapi.log.error("Failed to install library:", error);
      throw error;
    }
  },
  /**
   * Get content type cache
   */
  async getContentTypeCache(): Promise<any> {
    try {
      const cache = await getEditor().contentTypeCache.get();
      return cache;
    } catch (error) {
      strapi.log.error("Failed to get content type cache:", error);
      throw error;
    }
  },
  /**
   * Update content type cache
   */
  async updateContentTypeCache(): Promise<any> {
    try {
      const cache = await getEditor().contentTypeCache.update();
      return cache;
    } catch (error) {
      strapi.log.error("Failed to update content type cache:", error);
      throw error;
    }
  },
  /**
   * Get content hub metadata cache
   */
  async getContentHubMetadataCache(): Promise<any> {
    try {
      const cache = await getEditor().contentHubMetadataCache.get();
      return cache;
    } catch (error) {
      strapi.log.error("Failed to get content hub metadata cache:", error);
      throw error;
    }
  },
  /**
   * Update content hub metadata cache
   */
  async updateContentHubMetadataCache(): Promise<any> {
    try {
      const cache = await getEditor().contentHubMetadataCache.update();
      return cache;
    } catch (error) {
      strapi.log.error("Failed to update content hub metadata cache:", error);
      throw error;
    }
  },
  /**
   * Handle H5P AJAX requests
   */
  async handleAjax({ action, query, user, method, body, files }: HandleAjaxArgs): Promise<any> {
    try {
      const actionValue = Array.isArray(action) ? action[0] : action || "";
      const resolvedUser = resolveUser(user ?? undefined);
      const ajaxEndpoint = new h5pServer.H5PAjaxEndpoint(getEditor());
      const language = query?.language;
      const resolvedMethod = (method || "GET").toUpperCase();
      const postActions = new Set([
        "translations",
        "files",
        "filter",
        "library-install",
        "library-upload",
        "get-content",
      ]);
      const shouldPost = resolvedMethod === "POST" || postActions.has(actionValue);
      if (shouldPost) {
        const id = query?.id;
        const hubId = query?.hubId;
        const translate = (stringId: string, replacements: { [key: string]: any }) => {
          if (!replacements) {
            return stringId;
          }
          return Object.keys(replacements).reduce(
            (text, key) => text.split(`:${key}`).join(String(replacements[key])),
            stringId,
          );
        };
        const normalizeFile = (file: any) => {
          if (!file) {
            return undefined;
          }
          const actual = Array.isArray(file) ? file[0] : file;
          if (!actual) {
            return undefined;
          }
          return {
            data: actual.buffer,
            mimetype: actual.type || actual.mimetype,
            name: actual.name || actual.originalFilename || actual.filename,
            size: actual.size,
            tempFilePath: actual.path || actual.filepath || actual.tempFilePath,
          };
        };
        const filesFile = normalizeFile(files?.file);
        const libraryUploadFile = normalizeFile(files?.h5p);
        return await ajaxEndpoint.postAjax(
          actionValue,
          body,
          language,
          resolvedUser,
          filesFile,
          id,
          translate,
          libraryUploadFile,
          hubId,
        );
      }
      return await ajaxEndpoint.getAjax(
        actionValue,
        query?.machineName,
        query?.majorVersion,
        query?.minorVersion,
        language,
        resolvedUser,
      );
    } catch (error) {
      strapi.log.error("Failed to handle H5P AJAX request:", error);
      throw error;
    }
  },
  /**
   * Get content parameters
   */
  async getContentParams(contentId: string): Promise<any> {
    try {
      const params = await getEditor().contentStorage.get(contentId);
      return params;
    } catch (error) {
      strapi.log.error(`Failed to get content params for ${contentId}:`, error);
      throw error;
    }
  },
  /**
   * Save content
   */
  async saveContent(
    contentData: {
    library?: string | { machineName?: string; majorVersion?: number; minorVersion?: number };
    mainLibrary?: string | { machineName?: string; majorVersion?: number; minorVersion?: number };
    params?: any;
    metadata?: any;
    [key: string]: any;
    },
    user?: H5PUser | null,
  ): Promise<{ id: any }> {
    try {
      const parsedContentData =
        typeof contentData === "string" ? safeJsonParse(contentData) : contentData;
      const payload =
        parsedContentData &&
        typeof parsedContentData === "object" &&
        "data" in parsedContentData
          ? (parsedContentData as any).data
          : parsedContentData;

      function safeJsonParse(value: any) {
        if (typeof value !== "string") {
          return value;
        }
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }

      const parseJson = (value: any) => {
        if (typeof value !== "string") {
          return value;
        }
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      const buildLibrary = (input?: {
        machineName?: string;
        majorVersion?: number;
        minorVersion?: number;
      }): string | undefined => {
        if (!input?.machineName) return undefined;
        if (typeof input.majorVersion !== "number" || typeof input.minorVersion !== "number") {
          return undefined;
        }
        return `${input.machineName} ${input.majorVersion}.${input.minorVersion}`;
      };

      const resolveLibrary = (): string | undefined => {
        if (typeof payload?.library === "string") return payload.library;
        if (typeof payload?.mainLibrary === "string") return payload.mainLibrary;
        const libraryFromObject = buildLibrary(payload?.library as any);
        if (libraryFromObject) return libraryFromObject;
        const mainLibraryFromObject = buildLibrary(payload?.mainLibrary as any);
        if (mainLibraryFromObject) return mainLibraryFromObject;
        if (typeof payload?.ubername === "string") return payload.ubername;
        if (typeof payload?.libraryName === "string") return payload.libraryName;
        const params = parseJson(payload?.params);
        if (params && typeof params.library === "string") return params.library;
        if (params && typeof params.mainLibrary === "string") return params.mainLibrary;
        if (params?.params && typeof params.params.library === "string") {
          return params.params.library;
        }
        if (params?.params && typeof params.params.mainLibrary === "string") {
          return params.params.mainLibrary;
        }
        return undefined;
      };

      const parsedParams = parseJson(payload?.params);
      const parsedMetadata = parseJson(payload?.metadata);
      const paramsContainer = parsedParams?.params ? parsedParams : undefined;

      const normalizeLibrary = (value?: string) => {
        if (!value) return value;
        const match = /^([\w.]+)-(\d+\.\d+)$/.exec(value);
        if (match) {
          return `${match[1]} ${match[2]}`;
        }
        return value;
      };

      const library = normalizeLibrary(resolveLibrary());
      if (!library) {
        strapi.log.error("Failed to save content: missing library", {
          keys: Object.keys(contentData || {}),
        });
        throw new Error("missing-library");
      }

      const params = paramsContainer?.params ?? parsedParams;
      const rawMetadata = parsedMetadata ?? paramsContainer?.metadata;
      const fallbackTitle =
        rawMetadata?.title ??
        paramsContainer?.metadata?.title ??
        parsedParams?.metadata?.title ??
        parsedParams?.title ??
        payload?.title ??
        "Untitled";
      const metadata: Record<string, any> = {
        title: fallbackTitle,
      };

      if (typeof rawMetadata?.language === "string") {
        if (/^[-a-zA-Z]{1,10}$/.test(rawMetadata.language)) {
          metadata.language = rawMetadata.language;
        }
      }
      const resolvedUser = resolveUser(user ?? undefined);
      const contentId = await getEditor().saveOrUpdateContent(
        payload?.contentId ?? undefined,
        params,
        metadata,
        library,
        resolvedUser,
      );
      return { id: contentId };
    } catch (error) {
      strapi.log.error("Failed to save content:", error);
      throw error;
    }
  },
  /**
   * Get library file
   */
  async getLibraryFile(
    ubername: string,
    file: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    try {
      const h5pConfig = getConfig();
      const filePath = path.join(
        h5pConfig.contentStorage.libraryPath,
        ubername,
        file,
      );
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const mimeType = getMimeType(filePath);
      const stream = fs.createReadStream(filePath);
      return { stream, mimeType };
    } catch (error) {
      strapi.log.error("Failed to get library file:", error);
      throw error;
    }
  },
  /**
   * Get content file
   */
  async getContentFile(
    contentId: string,
    file: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    try {
      const h5pConfig = getConfig();
      const filePath = path.join(
        h5pConfig.contentStorage.contentPath,
        contentId,
        file,
      );
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const mimeType = getMimeType(filePath);
      const stream = fs.createReadStream(filePath);
      return { stream, mimeType };
    } catch (error) {
      strapi.log.error("Failed to get content file:", error);
      throw error;
    }
  },
  /**
   * Get core file
   */
  async getCoreFile(
    type: string,
    file: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    try {
      const h5pConfig = getConfig();
      const filePath = path.join(
        h5pConfig.contentStorage.libraryPath,
        "core",
        type,
        file,
      );
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const mimeType = getMimeType(filePath);
      const stream = fs.createReadStream(filePath);
      return { stream, mimeType };
    } catch (error) {
      strapi.log.error("Failed to get core file:", error);
      throw error;
    }
  },
  /**
   * Get editor file
   */
  async getEditorFile(
    type: string,
    file: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    try {
      const h5pConfig = getConfig();
      const filePath = path.join(
        h5pConfig.contentStorage.libraryPath,
        "editor",
        type,
        file,
      );
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const mimeType = getMimeType(filePath);
      const stream = fs.createReadStream(filePath);
      return { stream, mimeType };
    } catch (error) {
      strapi.log.error("Failed to get editor file:", error);
      throw error;
    }
  },
  /**
   * Render H5P player
   */
  async renderPlayer(contentId: string): Promise<any> {
    try {
      return await getPlayer().render(contentId);
    } catch (error) {
      strapi.log.error(`Failed to render H5P player for ${contentId}:`, error);
      throw error;
    }
  },
  /**
   * Render H5P editor
   */
  async renderEditor(contentId: string, user?: H5PUser | null): Promise<any> {
    try {
      const editorContentId = contentId === "new" ? null : contentId;
      const resolvedUser = resolveUser(user ?? undefined);
      // Set the contentId in state so the renderer can access it
      state.currentRenderContentId = editorContentId;
      const result = await getEditor().render(editorContentId, "en", resolvedUser);
      // Clear the contentId after rendering
      state.currentRenderContentId = null;
      return result;
    } catch (error) {
      state.currentRenderContentId = null;
      strapi.log.error("Failed to render H5P editor:", error);
      throw error;
    }
  },
  /**
   * Read file from filesystem
   */
  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      strapi.log.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  },
  /**
   * Download and install libraries from H5P Hub
   */
  async downloadLibraries(): Promise<{ success: true; count: number }> {
    try {
      strapi.log.info("Downloading H5P libraries...");
      // Define essential libraries to download
      const essentialLibraries = new Set([
        "H5P.MultiChoice",
        "H5P.QuestionSet",
        "H5P.InteractiveVideo",
        "H5P.CoursePresentation",
        "H5P.DragQuestion",
        "H5P.Blanks",
        "H5P.TrueFalse",
      ]);
      // Get available libraries
      const availableLibraries = await getEditor().contentHub.getLibraries();
      // Filter for essential libraries
      const librariesToDownload = availableLibraries.filter(
        (lib: { machineName: string; id: string }) =>
          essentialLibraries.has(lib.machineName),
      );
      strapi.log.info(
        `Found ${librariesToDownload.length} essential libraries to download`,
      );
      // Download and install each library
      for (const lib of librariesToDownload) {
        try {
          strapi.log.info(`Downloading ${lib.machineName}...`);
          await getEditor().contentHub.installLibrary(lib.id);
          strapi.log.info(`✅ Installed ${lib.machineName}`);
        } catch (error) {
          strapi.log.error(`Failed to install ${lib.machineName}:`, error);
        }
      }
      strapi.log.info("✅ H5P libraries download completed");
      return { success: true, count: librariesToDownload.length };
    } catch (error) {
      strapi.log.error("Failed to download H5P libraries:", error);
      throw error;
    }
  },
  /**
   * Install H5P libraries from a ZIP file
   */
  async installFromZip(zipFilePath: string): Promise<{ success: true; result: any }> {
    try {
      strapi.log.info(`Installing H5P libraries from ${zipFilePath}...`);
      if (!fs.existsSync(zipFilePath)) {
        throw new Error(`ZIP file not found: ${zipFilePath}`);
      }
      // Read ZIP file
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();
      // Extract to temporary directory
      const tempDir = path.join(
        getConfig().contentStorage.temporaryPath,
        `h5p-lib-${Date.now()}`,
      );
      await fs.ensureDir(tempDir);
      zip.extractAllTo(tempDir, true);
      // Check if it's a library or content
      const isLibrary = zipEntries.some((entry) =>
        entry.entryName.endsWith("library.json"),
      );
      if (isLibrary) {
        // Install library
        const result = await getEditor().libraryStorage.addLibraryFromDirectory(
          tempDir,
        );
        strapi.log.info("✅ Library installed successfully");
        return { success: true, result };
      } else {
        // Install content
        const result = await getEditor().contentStorage.addContentFromDirectory(
          tempDir,
        );
        strapi.log.info("✅ Content installed successfully");
        return { success: true, result };
      }
    } catch (error) {
      strapi.log.error("Failed to install from ZIP:", error);
      throw error;
    }
  },
  getMimeType,
  };
};
const services = {
  service,
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
  middlewares,
};
export default index;
