"use strict";

import { editorTemplate } from "./editor-template";

export type EditorRenderModel = {
  integration: unknown;
  scripts: string[];
  styles: string[];
  urlGenerator: {
    parameters: () => string;
  };
};

export type EditorRendererOptions = {
  saveEndpoint: string;
  paramsEndpoint: string;
};

export const renderEditorPage = (
  model: EditorRenderModel,
  options: EditorRendererOptions,
): string => {
  const integrationJson = JSON.stringify(model.integration, null, 2);
  const orderedScripts = [...model.scripts];
  const editorScriptIndex = orderedScripts.findIndex((script) => script.includes('h5peditor.js'));
  const editorEditorScriptIndex = orderedScripts.findIndex((script) => script.includes('h5peditor-editor.js'));

  if (editorScriptIndex !== -1 && editorEditorScriptIndex !== -1 && editorEditorScriptIndex < editorScriptIndex) {
    const [editorEditorScript] = orderedScripts.splice(editorEditorScriptIndex, 1);
    const targetIndex = orderedScripts.findIndex((script) => script.includes('h5peditor.js'));
    orderedScripts.splice(targetIndex + 1, 0, editorEditorScript);
  }
  const stylesMarkup = model.styles
    .map((style) => `<link rel="stylesheet" href="${style}">`)
    .join("\n");
  const scriptsMarkup = orderedScripts
    .map((script) => `<script src="${script}"></script>`)
    .join("\n");

  return editorTemplate
    .split("__STYLES__")
    .join(stylesMarkup)
    .split("__SCRIPTS__")
    .join(scriptsMarkup)
    .split("__INTEGRATION_JSON__")
    .join(integrationJson)
    .split("__SAVE_ENDPOINT__")
    .join(options.saveEndpoint)
    .split("__PARAMS_ENDPOINT__")
    .join(options.paramsEndpoint);
};
