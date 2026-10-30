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

export interface H5PContent {
  contentId?: string;
  library?: string;
  params?: Record<string, unknown>;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface H5PEditorFieldProps {
  attribute: {
    type: string;
    customField?: string;
    [key: string]: unknown;
  };
  intlLabel?: { id: string; defaultMessage: string };
  label?: string;
  name: string;
  required?: boolean;
  description?: { id: string; defaultMessage: string };
  hint?: string;
  disabled?: boolean;
  contentTypeUID?: string;
  labelAction?: React.ReactNode;
}
