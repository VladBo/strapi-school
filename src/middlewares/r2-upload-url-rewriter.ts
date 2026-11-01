import type { Core } from "@strapi/strapi";
import type { Middleware } from "koa";

type MiddlewareFactory<T> = (
  config: T,
  context: { strapi: Core.Strapi },
) => Middleware;

type AssetUrlConfig = {
  publicBaseUrl: string;
  rootPath: string;
};

function rewriteUploadUrl(
  value: string,
  { publicBaseUrl, rootPath }: AssetUrlConfig,
) {
  if (!value.startsWith("/uploads/")) return value;

  const suffix = value.slice("/uploads/".length);
  const path = suffix.split(/[?#]/, 1)[0];
  if (!path || path.split("/").some((segment) => segment === "..")) {
    return value;
  }

  return `${publicBaseUrl.replace(/\/+$/, "")}/${rootPath}/${suffix}`;
}

function rewriteUrls(value: unknown, config: AssetUrlConfig): void {
  if (Array.isArray(value)) {
    for (const item of value) rewriteUrls(item, config);
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "url" && typeof child === "string") {
      (value as Record<string, unknown>)[key] = rewriteUploadUrl(child, config);
    } else if (child && typeof child === "object") {
      rewriteUrls(child, config);
    }
  }
}

const r2UploadUrlRewriter: MiddlewareFactory<AssetUrlConfig> =
  (config) => async (ctx, next) => {
    await next();

    if (
      ctx.method !== "GET" ||
      ctx.status < 200 ||
      ctx.status >= 300 ||
      !ctx.is("application/json") ||
      !ctx.body ||
      typeof ctx.body !== "object"
    ) {
      return;
    }

    rewriteUrls(ctx.body, config);
  };

export default r2UploadUrlRewriter;
