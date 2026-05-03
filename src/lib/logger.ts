/**
 * Tiny structured logger.
 *
 * - Production (`NODE_ENV === 'production'`): one JSON object per line.
 *   Easy to ship to any log aggregator (Loki, Datadog, CloudWatch).
 * - Development: human-readable, colorless prefix + key=value tail.
 *
 * Use this instead of `console.log` / `console.error` in admin handlers
 * and any code that produces operational signal. Frontend code can keep
 * using `console` since browser logs are different audience anyway.
 */

type Level = 'info' | 'warn' | 'error';

const isProd =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

interface LogMeta {
  // Open shape — caller adds whatever context is useful (slug, ip, status).
  // Keep keys short and consistent across call sites.
  [key: string]: string | number | boolean | null | undefined;
}

function emit(level: Level, msg: string, meta?: LogMeta): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  };

  // Use console under the hood — keeps stack traces routed correctly and
  // means our existing CI captures show up as expected.
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (isProd) {
    fn(JSON.stringify(entry));
  } else {
    const tail = meta
      ? ' ' +
        Object.entries(meta)
          .map(([k, v]) => `${k}=${typeof v === 'string' ? JSON.stringify(v) : v}`)
          .join(' ')
      : '';
    fn(`[${entry.ts}] ${level.toUpperCase().padEnd(5)} ${msg}${tail}`);
  }
}

export const logger = {
  info: (msg: string, meta?: LogMeta) => emit('info', msg, meta),
  warn: (msg: string, meta?: LogMeta) => emit('warn', msg, meta),
  error: (msg: string, meta?: LogMeta) => emit('error', msg, meta),
};
