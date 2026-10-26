import type { Core } from "@strapi/strapi";

import { runStorageHealthCheck } from "../services/health-check";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async storage(ctx) {
    try {
      ctx.body = await runStorageHealthCheck({
        checkDatabase: () => strapi.db.connection.raw("select 1"),
        checkObjectStore: () =>
          strapi.plugin("h5p").service("service").checkStorage(),
      });
    } catch (error) {
      ctx.status = Number((error as { status?: number })?.status) || 503;
      ctx.body =
        (error as { result?: unknown })?.result || {
          status: "error",
          checks: { database: "error", objectStorage: "error" },
        };
    }
  },
});
