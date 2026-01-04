// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudnativeatlas.com',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true
    }
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
