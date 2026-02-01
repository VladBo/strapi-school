import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: "h5p-editor",
    plugin: "h5p",
    type: "json",
  });
};

export default register;
