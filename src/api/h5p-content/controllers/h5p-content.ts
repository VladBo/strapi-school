import { factories } from '@strapi/strapi';
import { sanitizePublicH5pResponse } from './public-h5p';

export default factories.createCoreController(
  'api::h5p-content.h5p-content',
  () => ({
    async find(ctx) {
      return sanitizePublicH5pResponse(await super.find(ctx));
    },
    async findOne(ctx) {
      return sanitizePublicH5pResponse(await super.findOne(ctx));
    },
  }),
);
