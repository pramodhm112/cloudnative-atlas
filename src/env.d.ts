/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Plaintext admin password compared against `safePasswordCompare`. */
  readonly ADMIN_PASSWORD: string;
  /**
   * Supabase project URL — e.g. https://xxxx.supabase.co.
   * Required for build (Content Layer loaders) and runtime (admin actions).
   */
  readonly SUPABASE_URL: string;
  /**
   * Supabase anon (publishable) key. Currently sees zero rows because
   * RLS is enabled with no policies; reserved for future browser use.
   */
  readonly SUPABASE_ANON_KEY: string;
  /**
   * Optional: Vercel Deploy Hook URL. When set, admin write actions POST
   * to this URL after a successful write so on-demand revalidation
   * regenerates the affected static pages.
   */
  readonly VERCEL_REVALIDATE_URL?: string;
}

// `SUPABASE_SERVICE_ROLE_KEY` is *deliberately* omitted from this interface.
// It is read via `process.env.SUPABASE_SERVICE_ROLE_KEY` only (see
// src/lib/supabase.ts), which means Vite cannot inline it into a client
// bundle. Accidentally writing `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
// in any file should fail TypeScript — leave the omission.

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface SessionData {
    authenticated: boolean;
  }
}
