const routes = {
  "content-api": {
    type: "content-api",
    routes: [
      {
        method: "GET",
        path: "/contents",
        handler: "controller.findContent",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/contents/:id",
        handler: "controller.findOneContent",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/contents",
        handler: "controller.createContent",
        config: { auth: false },
      },
      {
        method: "PUT",
        path: "/contents/:id",
        handler: "controller.updateContent",
        config: { auth: false },
      },
      {
        method: "DELETE",
        path: "/contents/:id",
        handler: "controller.deleteContent",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/libraries",
        handler: "controller.getLibraries",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/libraries/available",
        handler: "controller.getAvailableLibraries",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/libraries/install",
        handler: "controller.installLibrary",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/ajax",
        handler: "controller.getAjax",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/ajax",
        handler: "controller.getAjax",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/params/:contentId",
        handler: "controller.getContentParams",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/save",
        handler: "controller.saveContent",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/libraries/:ubername/:file*",
        handler: "controller.getLibraryFile",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/content/:contentId/:file*",
        handler: "controller.getContentFile",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/editor-model/:contentId",
        handler: "controller.getEditorModel",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/core/:type/:file*",
        handler: "controller.getCoreFile",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/editor/:type/:file*",
        handler: "controller.getEditorFile",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/play/:contentId",
        handler: "controller.getPlayPage",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/content-type-cache",
        handler: "controller.getContentTypeCache",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/content-type-cache",
        handler: "controller.updateContentTypeCache",
        config: { auth: false },
      },
      {
        method: "GET",
        path: "/content-hub-metadata-cache",
        handler: "controller.getContentHubMetadataCache",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/content-hub-metadata-cache",
        handler: "controller.updateContentHubMetadataCache",
        config: { auth: false },
      },
    ],
  },
};

export default routes;
