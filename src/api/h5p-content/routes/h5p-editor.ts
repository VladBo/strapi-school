export default {
  routes: [
    {
      method: 'GET',
      path: '/h5p-editor/:contentId',
      handler: 'h5p-editor.editorPage',
      config: {
        auth: false,
      },
    },
  ],
};
