/**
 * Lightweight in-memory rate limiter.
 *
 * Designed for the admin login flow — slow brute-force attempts without
 * pulling in Redis or any external dependency. Single-instance only:
 * if the app ever runs behind multiple Node processes / containers,
 * swap this for a shared backend (Upstash, Redis, etc.).
 *
 * Algorithm: per-key counter + first-attempt timestamp. After `limit`
 * failed attempts within `windowMs`, the key is locked until the window
 * expires. Successful attempts can call `resetRateLimit(key)` to clear
 * the counter immediately.
 */

interface Bucket {
  count: number;
  firstAttemptAt: number; // epoch ms — start of the current window
  lockedUntil: number;    // epoch ms — 0 if not currently locked
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup of stale buckets (older than 1 hour) to bound memory
// growth from one-off offenders. Runs on the next admin-login miss; no
// background timer needed.
const STALE_AFTER_MS = 60 * 60 * 1000;

function gcStale(now: number): void {
  if (buckets.size < 100) return; // don't sweep until there's something to sweep
  for (const [key, b] of buckets) {
    const last = Math.max(b.firstAttemptAt, b.lockedUntil);
    if (now - last > STALE_AFTER_MS) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** How many attempts are allowed within the window before locking. */
  limit: number;
  /** Window length in milliseconds — both the counting window and the lockout duration. */
  windowMs: number;
}

export interface RateLimitResult {
  /** True when the request is allowed; false when locked out. */
  allowed: boolean;
  /** Remaining attempts before lockout. 0 means the next failure will lock. */
  remaining: number;
  /** When the lockout expires (epoch ms). Only meaningful when `allowed === false`. */
  retryAfter: number;
  /** Seconds until the lockout expires — convenient for the `Retry-After` header. */
  retryAfterSeconds: number;
}

/**
 * Check whether `key` may proceed. Increments the counter as a side-effect.
 * Caller decides what counts as a "failed attempt" — typically only call
 * this on the failure path, so successful logins don't burn the budget.
 *
 * @example
 *   const rl = checkRateLimit(ip, { limit: 5, windowMs: 15 * 60 * 1000 });
 *   if (!rl.allowed) return errorResponse('Too many attempts', 429, 'RATE_LIMITED');
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  gcStale(now);

  let b = buckets.get(key);

  // Initialize or reset window if expired
  if (!b || now - b.firstAttemptAt > opts.windowMs) {
    b = { count: 0, firstAttemptAt: now, lockedUntil: 0 };
    buckets.set(key, b);
  }

  // Currently locked?
  if (b.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: b.lockedUntil,
      retryAfterSeconds: Math.ceil((b.lockedUntil - now) / 1000),
    };
  }

  // Increment counter and check threshold
  b.count += 1;
  if (b.count > opts.limit) {
    b.lockedUntil = now + opts.windowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfter: b.lockedUntil,
      retryAfterSeconds: Math.ceil(opts.windowMs / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - b.count),
    retryAfter: 0,
    retryAfterSeconds: 0,
  };
}

/**
 * Clear a key's bucket — call after a successful authentication so the
 * legitimate user's counter doesn't accidentally lock them later.
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * For tests only — wipes the entire bucket table.
 * @internal
 */
export function _resetAllRateLimits(): void {
  buckets.clear();
}
