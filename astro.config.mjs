// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Absolute path to the custom session driver. Astro resolves the
// `entrypoint` relative to its own location inside node_modules, so a
// project-local relative string ('./src/lib/...') won't resolve.
const sessionDriverEntrypoint = new URL('./src/lib/session-driver.ts', import.meta.url);

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
    // Custom Supabase-backed session driver. Replaces the previous
    // `driver: 'fs'` that broke on Vercel (every serverless invocation
    // got fresh ephemeral disk, so login appeared to succeed but the
    // next page saw no session). All session blobs live in the
    // `admin_sessions` table; expiry is enforced inside the driver via
    // `expires_at`. See src/lib/session-driver.ts.
    driver: { entrypoint: sessionDriverEntrypoint },
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
