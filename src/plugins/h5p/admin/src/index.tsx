import type { ComponentType } from "react";

const PLUGIN_ID = "h5p";

interface StrapiApp {
  registerPlugin: (config: { id: string; isReady: boolean; name: string }) => void;
  customFields: {
    register: (config: {
      name: string;
      pluginId: string;
      type: string;
      icon: ComponentType;
      intlLabel: { id: string; defaultMessage: string };
      intlDescription: { id: string; defaultMessage: string };
      components: {
        Input: () => Promise<{ default: ComponentType }>;
      };
    }) => void;
  };
}

const H5PIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M9 3v18" />
    <path d="M9 9h6" />
    <path d="M9 15h3" />
  </svg>
);

interface RegisterTradsParams {
  locales: string[];
}

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
