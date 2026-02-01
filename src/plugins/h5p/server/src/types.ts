import type { Context } from "koa";

export type StrapiContext = Context & {
  request: Context["request"] & {
    body?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
};

export type H5PUser = {
  id: string;
  name: string;
  email: string;
  type: "local" | string;
};

export type H5PConfigState = {
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

export type HandleAjaxArgs = {
  action?: string | string[];
  query?: Record<string, unknown>;
  user?: H5PUser | null;
  method?: string;
  body?: Record<string, unknown>;
  files?: Record<string, unknown>;
};
