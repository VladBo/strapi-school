const contentApi = {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/ajax",
      handler: "controller.getPublicAjax",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/params/:contentId",
      handler: "controller.getContentParams",
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
  ],
};

export default contentApi;
