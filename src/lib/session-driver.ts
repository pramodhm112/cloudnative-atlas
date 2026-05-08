/**
 * Supabase-backed Astro session driver.
 *
 * Astro's session API is built on top of `unstorage`. This file exports an
 * unstorage `Driver` that persists session blobs in the `admin_sessions`
 * table (id uuid, data jsonb, expires_at timestamptz). Replaces the
 * `driver: 'fs'` config that breaks on Vercel because each serverless
 * function invocation gets ephemeral disk.
 *
 * Wire it from astro.config.mjs:
 *   session: {
 *     driver: { entrypoint: './src/lib/session-driver.ts' },
 *     cookie: { name: 'admin_session', sameSite: 'strict', secure: true },
 *     ttl: 60 * 60 * 24,
 *   }
 *
 * The driver uses the service-role Supabase client so it can read/write
 * the `admin_sessions` table even with RLS enabled. The whole sessions
 * table is service-role-only by design.
 */

import type { Driver } from 'unstorage';
import { getSupabaseAdmin } from './supabase';

// 24h default — matches the existing astro.config.mjs `ttl` setting. Each
// `setItem` call refreshes `expires_at` to now + this value, so an active
// session stays alive even if the underlying cookie hasn't been touched
// recently. Configurable via the driver `config` if you ever need it.
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

interface DriverConfig {
  ttlSeconds?: number;
}

export default function supabaseSessionDriver(config: DriverConfig = {}): Driver {
  const ttl = config.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  return {
    name: 'supabase-sessions',
    options: config,

    async hasItem(key) {
      const { count, error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('id', key)
        .gt('expires_at', new Date().toISOString());
      if (error) throw new Error(`session.hasItem(${key}): ${error.message}`);
      return (count ?? 0) > 0;
    },

    async getItem(key) {
      const { data, error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .select('data, expires_at')
        .eq('id', key)
        .maybeSingle();

      if (error) throw new Error(`session.getItem(${key}): ${error.message}`);
      if (!data) return null;

      // Expired rows behave as if they don't exist — Astro will issue a
      // fresh session on the next request. The actual delete happens
      // either via `removeItem`, `dispose`, or a future cron job.
      if (new Date(data.expires_at).getTime() <= Date.now()) return null;

      // Astro stores serialised JSON strings through `setItem`. The DB
      // column is JSONB, so Postgres auto-parses; we re-stringify so the
      // unstorage interface (which expects strings) sees what it stored.
      return typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
    },

    async setItem(key, value) {
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      // The cookie value Astro hands us is the row id. We upsert so that
      // a re-set on an existing session refreshes its expiry without
      // creating a duplicate row.
      const { error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .upsert(
          { id: key, data: JSON.parse(value), expires_at: expiresAt },
          { onConflict: 'id' },
        );
      if (error) throw new Error(`session.setItem(${key}): ${error.message}`);
    },

    async removeItem(key) {
      const { error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .delete()
        .eq('id', key);
      if (error) throw new Error(`session.removeItem(${key}): ${error.message}`);
    },

    async getKeys() {
      const { data, error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .select('id')
        .gt('expires_at', new Date().toISOString());
      if (error) throw new Error(`session.getKeys: ${error.message}`);
      return (data ?? []).map((r) => r.id as string);
    },

    async clear() {
      // Wipe every session — Astro never calls this in normal operation,
      // but it's part of the Driver contract for completeness.
      const { error } = await getSupabaseAdmin()
        .from('admin_sessions')
        .delete()
        .gte('expires_at', '1970-01-01');
      if (error) throw new Error(`session.clear: ${error.message}`);
    },

    async dispose() {
      // Best-effort cleanup of expired rows. Runs at request teardown
      // on serverless platforms — light enough to be free, important
      // enough that the table doesn't grow unbounded.
      try {
        await getSupabaseAdmin()
          .from('admin_sessions')
          .delete()
          .lt('expires_at', new Date().toISOString());
      } catch {
        // Swallow — dispose runs on the way out, never a hard failure.
      }
    },
  };
}
