import { Core } from "@strapi/strapi";
import type { StrapiContext } from "../types";
import { getErrorMessage, createSlug } from "../utils";

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
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
      const content = await strapi
        .documents("api::h5p-content.h5p-content")
        .findOne({
          documentId: id,
          ...ctx.query,
        });
      ctx.body = content;
    } catch (err) {
      ctx.throw(500, getErrorMessage(err));
    }
  },
  async createContent(ctx: StrapiContext) {
    try {
      const { title, library, parameters, metadata } = ctx.request
        .body as Record<string, unknown>;
      const slug = createSlug(title as string);
      const embedCode = `<iframe src="${strapi.config.get(
        "server.url",
      )}/api/h5p/content/${slug}/embed" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
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
      const { id } = ctx.request.body as Record<string, unknown>;
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
  async getEditorModel(ctx: StrapiContext) {
    try {
      const h5pService = strapi.plugin("h5p").service("service");
      const contentId =
        ctx.params.contentId === "new" ? null : ctx.params.contentId;
      const resolvedUser = ctx.state?.user;
      const editorModel = await h5pService.getEditorModel(
        contentId,
        resolvedUser,
      );
      ctx.body = editorModel;
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
        ctx.query.action ||
        (ctx.request.body &&
          (ctx.request.body as Record<string, unknown>).action);
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

export default controller;
