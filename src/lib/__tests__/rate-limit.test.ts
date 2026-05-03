import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimit, _resetAllRateLimits } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetAllRateLimits();
  });

  it('allows up to `limit` attempts then locks on the next one', () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(checkRateLimit('a', opts).allowed).toBe(true); // 1
    expect(checkRateLimit('a', opts).allowed).toBe(true); // 2
    expect(checkRateLimit('a', opts).allowed).toBe(true); // 3
    const fourth = checkRateLimit('a', opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('decrements `remaining` correctly', () => {
    const opts = { limit: 5, windowMs: 60_000 };
    expect(checkRateLimit('b', opts).remaining).toBe(4);
    expect(checkRateLimit('b', opts).remaining).toBe(3);
    expect(checkRateLimit('b', opts).remaining).toBe(2);
    expect(checkRateLimit('b', opts).remaining).toBe(1);
    expect(checkRateLimit('b', opts).remaining).toBe(0); // last allowed
    expect(checkRateLimit('b', opts).allowed).toBe(false); // 6th locks
  });

  it('keys are independent', () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit('alice', opts).allowed).toBe(true);
    expect(checkRateLimit('bob', opts).allowed).toBe(true);
    // Both used their one allowed attempt — next is locked for each
    expect(checkRateLimit('alice', opts).allowed).toBe(false);
    expect(checkRateLimit('bob', opts).allowed).toBe(false);
  });

  it('lockout expires after the window', () => {
    vi.useFakeTimers();
    try {
      const opts = { limit: 2, windowMs: 1000 };
      checkRateLimit('c', opts);
      checkRateLimit('c', opts);
      expect(checkRateLimit('c', opts).allowed).toBe(false); // locked

      // Advance past the window
      vi.advanceTimersByTime(1500);

      // First call after expiry resets the bucket and is allowed
      expect(checkRateLimit('c', opts).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resetRateLimit clears the bucket immediately', () => {
    const opts = { limit: 2, windowMs: 60_000 };
    checkRateLimit('d', opts);
    checkRateLimit('d', opts);
    expect(checkRateLimit('d', opts).allowed).toBe(false); // locked

    resetRateLimit('d');
    // After reset, fresh limit budget
    expect(checkRateLimit('d', opts).allowed).toBe(true);
  });

  it('returns retryAfter epoch ms in the future when locked', () => {
    const opts = { limit: 1, windowMs: 5000 };
    checkRateLimit('e', opts); // allowed
    const locked = checkRateLimit('e', opts);
    expect(locked.allowed).toBe(false);
    expect(locked.retryAfter).toBeGreaterThan(Date.now());
    expect(locked.retryAfter).toBeLessThanOrEqual(Date.now() + opts.windowMs + 100);
  });
});
