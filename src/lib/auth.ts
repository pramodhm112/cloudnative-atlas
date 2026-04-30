import crypto from 'node:crypto';

/**
 * Constant-time comparison of a password against the expected value.
 * Hashes both first to ensure equal length and prevent timing leaks.
 */
export function safePasswordCompare(input: string, expected: string): boolean {
  const hashA = crypto.createHash('sha256').update(input).digest('hex');
  const hashB = crypto.createHash('sha256').update(expected).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hashA), Buffer.from(hashB));
}
