const PUBLIC_ASSET_METHODS = [
  "contentFilesUrl",
  "coreFile",
  "coreFiles",
  "editorLibraryFile",
  "editorLibraryFiles",
  "libraryFile",
  "parameters",
  "play",
];

export function createEditorUrlGenerator({
  UrlGenerator,
  adminConfig,
  publicConfig,
}) {
  if (typeof UrlGenerator !== "function") {
    throw new TypeError("An H5P URL generator constructor is required");
  }

  const admin = new UrlGenerator(adminConfig);
  const publicAssets = new UrlGenerator(publicConfig);
  for (const method of PUBLIC_ASSET_METHODS) {
    if (typeof publicAssets[method] === "function") {
      admin[method] = (...args) => publicAssets[method](...args);
    }
  }
  return admin;
}
