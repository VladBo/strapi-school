import type { Core } from "@strapi/strapi";
import type { Middleware } from "koa";
import { rewriteUrls } from "./r2-upload-url-rewriter-core";

type MiddlewareFactory<T> = (
  config: T,
  context: { strapi: Core.Strapi },
) => Middleware;

type AssetUrlConfig = {
  publicBaseUrl: string;
  rootPath: string;
};

const r2UploadUrlRewriter: MiddlewareFactory<AssetUrlConfig> =
  (config) => async (ctx, next) => {
    await next();

    if (
      ctx.method !== "GET" ||
      ctx.status < 200 ||
      ctx.status >= 300 ||
      !ctx.response.is("application/json") ||
      !ctx.body ||
      typeof ctx.body !== "object"
    ) {
      return;
    }

    rewriteUrls(ctx.body, config);
  };

export default r2UploadUrlRewriter;
