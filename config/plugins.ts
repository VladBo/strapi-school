export default () => ({
  navigation: {
    enabled: true,
    config: {
      contentTypes: ["api::page.article"],
      defaultContentTypes: "api::page.article",
      contentTypesNameFields: {
        "api::page.article": ["title"],
      },
      pathDefaultFields: {
        "api::page.article": ["slug"],
      },
      allowedLevels: 2,
    },
  },
});
