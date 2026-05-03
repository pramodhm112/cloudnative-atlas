// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudnativeatlas.com',
  output: 'static',
  // Vercel adapter — turns each `prerender = false` route (admin, login,
  // logout, the actions endpoints) into a serverless function. Static
  // routes (home, blog list, public pages) are still pre-built into
  // dist/client/. The Vercel build pipeline picks up dist/ + .vercel/output
  // automatically; no project-level config needed in the Vercel dashboard.
  adapter: vercel(),
  session: {
    // ⚠ Filesystem session driver works for `astro dev` and for any
    // non-serverless host (your own VPS, Railway, etc.) but is unreliable
    // on Vercel: each serverless invocation has ephemeral disk, so a
    // session written by the login function may not be visible to the
    // next request. Admin login on Vercel will appear to "succeed" then
    // the next page loads as logged-out.
    //
    // To make admin work on Vercel, swap to a remote driver such as
    // `@upstash/redis` or Vercel KV — see
    // https://docs.astro.build/en/reference/configuration-reference/#sessions
    // for the snippet. Until then, treat Vercel as public-site only.
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
