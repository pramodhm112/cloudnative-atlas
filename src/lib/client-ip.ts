/**
 * Resolve the client IP for rate-limit keying.
 *
 * Default behaviour reads `clientAddress` from the Astro request context.
 * When `trustProxy` is true (set via the `TRUST_PROXY` env var in
 * production deployments behind a reverse proxy), the leftmost
 * `X-Forwarded-For` token is used instead — that's the IP the proxy
 * received the request from before forwarding it to us.
 *
 * Returns null when no IP can be resolved; callers should fail closed
 * in production rather than collapse all unknown-IP traffic into one
 * bucket (which would let an attacker lock the admin out by spamming
 * unauthenticated requests).
 */

export interface ResolveClientIpOptions {
  clientAddress?: string;
  headers: Headers;
  trustProxy: boolean;
}

export function resolveClientIp({ clientAddress, headers, trustProxy }: ResolveClientIpOptions): string | null {
  if (trustProxy) {
    // X-Forwarded-For is a comma-separated list; the leftmost entry is the
    // original client IP per RFC 7239 / common proxy convention.
    const xff = headers.get('x-forwarded-for');
    if (xff) {
      const first = xff.split(',')[0]?.trim();
      if (first) return first;
    }
    // Fallback ordering for proxies that don't set XFF.
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp.trim();
  }
  if (clientAddress && clientAddress.trim() !== '') return clientAddress.trim();
  return null;
}
