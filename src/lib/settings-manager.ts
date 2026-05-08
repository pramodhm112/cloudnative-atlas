/**
 * Feature-flag store, backed by Supabase.
 *
 * Public API mirrors the previous filesystem implementation:
 *   readSettings()              → FeatureFlags
 *   writeSettings(partial)      → FeatureFlags  (returns merged result)
 *
 * The `settings` table is constrained to a single row via a boolean PK
 * with a CHECK on the value, so there's no race window where two settings
 * rows could exist. The migration script seeds a default row, so this
 * code can always assume the row exists — but readSettings still falls
 * back to defaults if the SELECT returns null, matching the FS behaviour.
 */

import { getSupabaseAdmin, type SettingsRow } from './supabase';

export interface FeatureFlags {
  enablePresentations: boolean;
  enableVideos: boolean;
}

const DEFAULTS: FeatureFlags = {
  enablePresentations: false,
  enableVideos: false,
};

function rowToFlags(row: SettingsRow | null | undefined): FeatureFlags {
  if (!row) return { ...DEFAULTS };
  return {
    enablePresentations: row.enable_presentations,
    enableVideos: row.enable_videos,
  };
}

export async function readSettings(): Promise<FeatureFlags> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('settings')
      .select('*')
      .eq('singleton', true)
      .maybeSingle();

    if (error) throw error;
    return rowToFlags(data as SettingsRow | null);
  } catch {
    // Fail-safe: if Supabase is unreachable, fall back to defaults so the
    // public site stays renderable. Errors are swallowed by design — the
    // caller doesn't have a useful recovery path either.
    return { ...DEFAULTS };
  }
}

export async function writeSettings(
  flags: Partial<FeatureFlags>,
): Promise<FeatureFlags> {
  const current = await readSettings();
  const updated: FeatureFlags = {
    enablePresentations: flags.enablePresentations ?? current.enablePresentations,
    enableVideos: flags.enableVideos ?? current.enableVideos,
  };

  const { error } = await getSupabaseAdmin()
    .from('settings')
    .upsert(
      {
        singleton: true,
        enable_presentations: updated.enablePresentations,
        enable_videos: updated.enableVideos,
      },
      { onConflict: 'singleton' },
    );

  if (error) throw new Error(`writeSettings: ${error.message}`);
  return updated;
}
