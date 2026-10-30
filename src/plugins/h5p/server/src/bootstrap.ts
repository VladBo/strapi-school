import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const h5pService = strapi.plugin("h5p").service("service");
  await h5pService.initialize();
};

export default bootstrap;
