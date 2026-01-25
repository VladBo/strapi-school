import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async editorPage(ctx) {
    try {
      const { contentId } = ctx.params;
      const h5pService = strapi.plugin('h5p').service('service');

      // Get the editor HTML from the H5P plugin
      // The h5p-static middleware handles injecting H5P.jQuery initialization
      const editorHtml = await h5pService.renderEditor(contentId);

      ctx.type = 'html';
      ctx.body = editorHtml;
    } catch (error) {
      strapi.log.error('Error rendering H5P editor:', error);
      ctx.throw(500, 'Failed to render H5P editor');
    }
  },
});
