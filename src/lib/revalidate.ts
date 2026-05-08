/**
 * Vercel deploy-hook revalidation.
 *
 * After any admin write that affects public-site content, call
 * `revalidate()` to POST the configured Vercel Deploy Hook URL. That
 * triggers a fresh build → the prebuild sync pulls the latest Supabase
 * rows → the static site reflects the change in 30–90 seconds.
 *
 * Best-effort: failures are logged but do NOT throw. We don't want a
 * misconfigured webhook to fail the admin save the user just clicked.
 *
 * No-op when `VERCEL_REVALIDATE_URL` is unset (local dev, or before the
 * operator wires up the deploy hook).
 */

import { logger } from './logger';

export async function revalidate(reason: string): Promise<void> {
  const url =
    process.env.VERCEL_REVALIDATE_URL ??
    (import.meta.env.VERCEL_REVALIDATE_URL as string | undefined);
  if (!url) return;

  try {
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      logger.info('revalidate.triggered', { reason });
    } else {
      logger.warn('revalidate.failed', { reason, status: res.status });
    }
  } catch (err) {
    logger.warn('revalidate.error', {
      reason,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
