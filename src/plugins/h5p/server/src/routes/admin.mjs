const authenticated = {
  policies: ["admin::isAuthenticatedAdmin"],
};

const route = (method, path, handler) => ({
  method,
  path,
  handler,
  config: authenticated,
});

const admin = {
  type: "admin",
  routes: [
    route("GET", "/contents", "controller.findContent"),
    route("GET", "/contents/:id", "controller.findOneContent"),
    route("POST", "/contents", "controller.createContent"),
    route("PUT", "/contents/:id", "controller.updateContent"),
    route("DELETE", "/contents/:id", "controller.deleteContent"),
    route("GET", "/libraries", "controller.getLibraries"),
    route("GET", "/libraries/available", "controller.getAvailableLibraries"),
    route("POST", "/libraries/install", "controller.installLibrary"),
    route("GET", "/ajax", "controller.getAjax"),
    route("POST", "/ajax", "controller.getAjax"),
    route("GET", "/params/:contentId", "controller.getContentParams"),
    route("POST", "/save", "controller.saveContent"),
    route(
      "GET",
      "/libraries/:ubername/:file*",
      "controller.getLibraryFile",
    ),
    route(
      "GET",
      "/content/:contentId/:file*",
      "controller.getContentFile",
    ),
    route("GET", "/editor-model/:contentId", "controller.getEditorModel"),
    route("GET", "/core/:type/:file*", "controller.getCoreFile"),
    route("GET", "/editor/:type/:file*", "controller.getEditorFile"),
    route("GET", "/play/:contentId", "controller.getPlayPage"),
    route("GET", "/content-type-cache", "controller.getContentTypeCache"),
    route("POST", "/content-type-cache", "controller.updateContentTypeCache"),
    route(
      "GET",
      "/content-hub-metadata-cache",
      "controller.getContentHubMetadataCache",
    ),
    route(
      "POST",
      "/content-hub-metadata-cache",
      "controller.updateContentHubMetadataCache",
    ),
  ],
};

export default admin;
