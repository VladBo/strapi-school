import type { RegisterTradsParams, StrapiApp } from "./types";
import H5PIcon from "./icons/h5p-icon";

const PLUGIN_ID = "h5p";


export default {
  register(app: StrapiApp) {
    console.log("[H5P Plugin] Registering plugin...");

    app.registerPlugin({
      id: PLUGIN_ID,
      isReady: true,
      name: PLUGIN_ID,
    });

    console.log("[H5P Plugin] Registering H5P Editor custom field...");

    app.customFields.register({
      name: "h5p-editor",
      pluginId: PLUGIN_ID,
      type: "json",
      icon: H5PIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.h5p-editor.label`,
        defaultMessage: "H5P Interactive Content",
      },
      intlDescription: {
        id: `${PLUGIN_ID}.h5p-editor.description`,
        defaultMessage:
          "Create and edit interactive H5P content with a visual editor",
      },
      components: {
        Input: async () => import("./components/h5p-editor-field"),
      },
    });

    console.log("[H5P Plugin] Custom field registered successfully");
  },

  async registerTrads({ locales }: RegisterTradsParams) {
    return locales.map((locale) => ({ data: {}, locale }));
  },
};
