import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  tsconfig: './tsconfig.build.json',
  externals: [
    "../_chunks/",
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-intl',
    '@strapi/design-system',
    '@strapi/icons',
    '@strapi/helper-plugin',
    'styled-components',
  ],
});
