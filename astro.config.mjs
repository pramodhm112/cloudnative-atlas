// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudnativeatlas.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  session: {
    driver: 'fs',
    cookie: {
      name: 'admin_session',
      sameSite: 'strict',
      secure: true,
    },
    ttl: 60 * 60 * 24,
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
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
