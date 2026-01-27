import type { ComponentType } from "react";

export interface StrapiApp {
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
        Input: () => Promise<{ default: ComponentType<any> }>;
      };
    }) => void;
  };
}

export interface RegisterTradsParams {
  locales: string[];
}
