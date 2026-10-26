import path from "node:path";
import fs from "fs-extra";
import * as h5pServer from "@lumieducation/h5p-server";
import type {
  H5PUser,
  H5PConfigState,
  H5PFileResponse,
  HandleAjaxArgs,
} from "../types";
import {
  resolveUser,
  getMimeType,
  safeJsonParse,
  resolveLibrary,
  normalizeLibrary,
  getFileStreamResponse,
  getMainLibraryVersion,
} from "../utils";
import { Core } from "@strapi/strapi";
import {
  importPackageWithEditor,
  resolveMaxFileSize,
  resolveMaxTotalSize,
} from "./h5p-import.mjs";
import { createH5PStorages } from "../storage/h5p-storage-factory.mjs";
import { createH5PFileResponse } from "./h5p-file-response.mjs";

const service = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    h5pConfig: H5PConfigState | null;
    h5pEditor: any | null;
    h5pPlayer: any | null;
    libraryStorage: any | null;
    contentStorage: any | null;
    objectStore: any | null;
  } = {
    h5pConfig: null,
    h5pEditor: null,
    h5pPlayer: null,
    libraryStorage: null,
    contentStorage: null,
    objectStore: null,
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

  return {
    async initialize(): Promise<void> {
      strapi.log.info("Initializing H5P Editor and Player...");
      const config2 = strapi.config.get("plugin.h5p") || {};
      const pluginConfig = config2.config || {};
      const baseUrl = "/api/h5p";
      const h5pConfig = new h5pServer.H5PConfig(void 0, {
        baseUrl,
        contentHubEnabled: true,
        maxFileSize: resolveMaxFileSize(pluginConfig.maxFileSize),
        maxTotalSize: resolveMaxTotalSize(pluginConfig.maxTotalSize),
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
      await fs.ensureDir(libraryPath);
      await fs.ensureDir(contentPath);
      await fs.ensureDir(temporaryPath);
      const cache = new h5pServer.fsImplementations.InMemoryStorage();
      const storageDriver = String(
        process.env.STORAGE_DRIVER || pluginConfig.storageDriver || "local",
      ).toLowerCase();
      const { libraryStorage, contentStorage, temporaryStorage, objectStore } =
        createH5PStorages({
          driver: storageDriver,
          libraryPath,
          contentPath,
          temporaryPath,
          s3: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION,
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            bucket: process.env.S3_LIVE_BUCKET,
          },
        });
      state.libraryStorage = libraryStorage;
      state.contentStorage = contentStorage;
      state.objectStore = objectStore;
      state.h5pEditor = new h5pServer.H5PEditor(
        cache,
        h5pConfig,
        libraryStorage,
        contentStorage,
        temporaryStorage,
      );
      state.h5pPlayer = new h5pServer.H5PPlayer(
        libraryStorage,
        contentStorage,
        h5pConfig,
      );
      strapi.log.info("H5P Editor and Player initialized successfully");
    },
    async getInstalledLibraries(): Promise<any> {
      try {
        const libraries =
          await getEditor().libraryManager.listInstalledLibraries();
        return libraries;
      } catch (error) {
        strapi.log.error("Failed to get installed libraries:", error);
        throw error;
      }
    },
    async getAvailableLibraries(): Promise<any> {
      try {
        const libraries = await getEditor().contentHub.getLibraries();
        return libraries;
      } catch (error) {
        strapi.log.error("Failed to get available libraries:", error);
        throw error;
      }
    },
    async installLibrary(libraryId: string): Promise<any> {
      try {
        const result = await getEditor().contentHub.installLibrary(libraryId);
        return { success: true, result };
      } catch (error) {
        strapi.log.error("Failed to install library:", error);
        throw error;
      }
    },
    async getContentTypeCache(): Promise<any> {
      try {
        const cache = await getEditor().contentTypeCache.get();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to get content type cache:", error);
        throw error;
      }
    },
    async updateContentTypeCache(): Promise<any> {
      try {
        const cache = await getEditor().contentTypeCache.update();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to update content type cache:", error);
        throw error;
      }
    },
    async getContentHubMetadataCache(): Promise<any> {
      try {
        const cache = await getEditor().contentHubMetadataCache.get();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to get content hub metadata cache:", error);
        throw error;
      }
    },
    async updateContentHubMetadataCache(): Promise<any> {
      try {
        const cache = await getEditor().contentHubMetadataCache.update();
        return cache;
      } catch (error) {
        strapi.log.error("Failed to update content hub metadata cache:", error);
        throw error;
      }
    },
    async handleAjax({
      action,
      query,
      user,
      method,
      body,
      files,
    }: HandleAjaxArgs): Promise<any> {
      try {
        const actionValue = Array.isArray(action) ? action[0] : action || "";
        const resolvedUsr = resolveUser(user ?? undefined);
        const ajaxEndpoint = new h5pServer.H5PAjaxEndpoint(getEditor());
        const language = (query as Record<string, unknown> | undefined)
          ?.language as string | undefined;
        const resolvedMethod = (method || "GET").toUpperCase();
        const postActions = new Set([
          "translations",
          "files",
          "filter",
          "library-install",
          "library-upload",
          "get-content",
        ]);
        const shouldPost =
          resolvedMethod === "POST" || postActions.has(actionValue);
        if (shouldPost) {
          const id = (query as Record<string, unknown> | undefined)?.id as
            | string
            | undefined;
          const hubId = (query as Record<string, unknown> | undefined)
            ?.hubId as string | undefined;
          const translate = (
            stringId: string,
            replacements: { [key: string]: any },
          ) => {
            if (!replacements) {
              return stringId;
            }
            return Object.keys(replacements).reduce(
              (text, key) =>
                text.split(`:${key}`).join(String(replacements[key])),
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
              tempFilePath:
                actual.path || actual.filepath || actual.tempFilePath,
            };
          };
          const filesObj = files as Record<string, unknown> | undefined;
          const filesFile = normalizeFile(filesObj?.file);
          const libraryUploadFile = normalizeFile(filesObj?.h5p);
          const resolvedBody = body as
            | { libraries: string[] }
            | { contentId: string; field: string }
            | { libraryParameters: string }
            | undefined;
          return await ajaxEndpoint.postAjax(
            actionValue,
            resolvedBody,
            language,
            resolvedUsr,
            filesFile,
            id,
            translate,
            libraryUploadFile,
            hubId,
          );
        }
        const queryObj = query as Record<string, unknown> | undefined;
        return await ajaxEndpoint.getAjax(
          actionValue,
          queryObj?.machineName as string | undefined,
          queryObj?.majorVersion as string | undefined,
          queryObj?.minorVersion as string | undefined,
          language,
          resolvedUsr,
        );
      } catch (error) {
        strapi.log.error("Failed to handle H5P AJAX request:", error);
        throw error;
      }
    },
    async getContentParams(contentId: string): Promise<any> {
      try {
        const contentStorage = getEditor().contentStorage;
        const [metadata, parameters] = await Promise.all([
          contentStorage.getMetadata(contentId),
          contentStorage.getParameters(contentId),
        ]);
        return {
          library: getMainLibraryVersion(metadata),
          params: parameters,
          metadata: {
            title: metadata.title,
            license: metadata.license,
          },
        };
      } catch (error) {
        strapi.log.error(
          `Failed to get content params for ${contentId}:`,
          error,
        );
        throw error;
      }
    },
    async saveContent(
      contentData: {
        library?:
          | string
          | {
              machineName?: string;
              majorVersion?: number;
              minorVersion?: number;
            };
        mainLibrary?:
          | string
          | {
              machineName?: string;
              majorVersion?: number;
              minorVersion?: number;
            };
        params?: any;
        metadata?: any;
        [key: string]: any;
      },
      user?: H5PUser | null,
    ): Promise<{ id: any }> {
      try {
        const parsedContentData =
          typeof contentData === "string"
            ? safeJsonParse(contentData)
            : contentData;
        const payload =
          parsedContentData &&
          typeof parsedContentData === "object" &&
          "data" in (parsedContentData as Record<string, unknown>)
            ? (parsedContentData as any).data
            : parsedContentData;

        const library = normalizeLibrary(
          resolveLibrary(payload as Record<string, unknown>),
        );
        if (!library) {
          strapi.log.error("Failed to save content: missing library", {
            keys: Object.keys(contentData || {}),
          });
          throw new Error("missing-library");
        }

        const parsedParams = safeJsonParse(payload?.params);
        const parsedMetadata = safeJsonParse(payload?.metadata);
        const paramsContainer = (parsedParams as Record<string, unknown>)
          ?.params
          ? parsedParams
          : undefined;

        const params =
          (paramsContainer as Record<string, unknown>)?.params ?? parsedParams;
        const rawMetadata =
          parsedMetadata ??
          (paramsContainer as Record<string, unknown>)?.metadata;
        const fallbackTitle =
          (rawMetadata as Record<string, unknown>)?.title ??
          (
            (paramsContainer as Record<string, unknown>)?.metadata as
              | Record<string, unknown>
              | undefined
          )?.title ??
          (
            (parsedParams as Record<string, unknown>)?.metadata as
              | Record<string, unknown>
              | undefined
          )?.title ??
          (parsedParams as Record<string, unknown>)?.title ??
          payload?.title ??
          "Untitled";
        const metadata: Record<string, any> = {
          title: fallbackTitle,
        };

        if (
          typeof (rawMetadata as Record<string, unknown>)?.language === "string"
        ) {
          if (
            /^[-a-zA-Z]{1,10}$/.test(
              (rawMetadata as Record<string, string>).language,
            )
          ) {
            metadata.language = (
              rawMetadata as Record<string, string>
            ).language;
          }
        }
        const resolvedUsr = resolveUser(user ?? undefined);
        const contentId = await getEditor().saveOrUpdateContent(
          payload?.contentId ?? undefined,
          params,
          metadata,
          library,
          resolvedUsr,
        );
        return { id: contentId };
      } catch (error) {
        strapi.log.error("Failed to save content:", error);
        throw error;
      }
    },
    async importPackage(
      packagePath: string,
      user?: H5PUser | null,
    ): Promise<{
      id: any;
      installedLibraries: any[];
      library: string;
      metadata: any;
      parameters: any;
    }> {
      try {
        return await importPackageWithEditor(
          getEditor(),
          packagePath,
          resolveUser(user ?? undefined),
        );
      } catch (error) {
        strapi.log.error(`Failed to import H5P package ${packagePath}:`, error);
        throw error;
      }
    },
    async getLibraryFile(
      ubername: string,
      file: string,
      rangeHeader?: string,
    ): Promise<H5PFileResponse> {
      try {
        if (!state.libraryStorage) {
          throw new Error("H5P library storage not initialized");
        }
        const library = h5pServer.LibraryName.fromUberName(ubername);
        return createH5PFileResponse({
          filename: file,
          mimeType: getMimeType(file),
          rangeHeader,
          getStats: () => state.libraryStorage.getFileStats(library, file),
          getStream: () => state.libraryStorage.getFileStream(library, file),
        });
      } catch (error) {
        strapi.log.error("Failed to get library file:", error);
        throw error;
      }
    },
    async getContentFile(
      contentId: string,
      file: string,
      rangeHeader?: string,
    ): Promise<H5PFileResponse> {
      try {
        if (!state.contentStorage) {
          throw new Error("H5P content storage not initialized");
        }
        let resolvedFile = file;
        if (file === "content/content.json") {
          resolvedFile = "content.json";
        } else if (file.startsWith("content/")) {
          resolvedFile = file.replace(/^content\//, "");
        }
        return createH5PFileResponse({
          filename: resolvedFile,
          mimeType: getMimeType(resolvedFile),
          rangeHeader,
          getStats: () =>
            state.contentStorage.getFileStats(contentId, resolvedFile),
          getStream: () =>
            state.contentStorage.getFileStream(contentId, resolvedFile),
          getRangeStream: (start: number, end: number) =>
            state.contentStorage.getFileStream(
              contentId,
              resolvedFile,
              undefined,
              start,
              end,
            ),
        });
      } catch (error) {
        strapi.log.error("Failed to get content file:", error);
        throw error;
      }
    },
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
        return getFileStreamResponse(filePath);
      } catch (error) {
        strapi.log.error("Failed to get core file:", error);
        throw error;
      }
    },
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
        return getFileStreamResponse(filePath);
      } catch (error) {
        strapi.log.error("Failed to get editor file:", error);
        throw error;
      }
    },
    async renderPlayer(contentId: string): Promise<any> {
      try {
        return await getPlayer().render(contentId);
      } catch (error) {
        strapi.log.error(
          `Failed to render H5P player for ${contentId}:`,
          error,
        );
        throw error;
      }
    },
    async getEditorModel(
      contentId: string | null,
      user?: H5PUser | null,
    ): Promise<any> {
      try {
        const resolvedUsr = resolveUser(user ?? undefined);
        const originalRenderer = getEditor().setRenderer((model: any) => model);
        try {
          const editorModel = await getEditor().render(
            contentId,
            "en",
            resolvedUsr,
          );
          return editorModel;
        } finally {
          getEditor().setRenderer(originalRenderer);
        }
      } catch (error) {
        strapi.log.error("Failed to get editor model:", error);
        throw error;
      }
    },
    async readFile(filePath: string): Promise<Buffer> {
      try {
        return await fs.readFile(filePath);
      } catch (error) {
        strapi.log.error(`Failed to read file ${filePath}:`, error);
        throw error;
      }
    },
    async checkStorage(): Promise<void> {
      if (state.objectStore) {
        await state.objectStore.list("libraries/");
        return;
      }
      const config = getConfig();
      await Promise.all([
        fs.access(config.contentStorage.libraryPath),
        fs.access(config.contentStorage.contentPath),
      ]);
    },
    getMimeType,
  };
};

export default service;
