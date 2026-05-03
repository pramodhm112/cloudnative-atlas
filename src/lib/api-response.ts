/**
 * Standardized JSON responses for admin and contact API endpoints.
 *
 * Keeps the error shape identical across routes so the client always
 * sees `{ error: string, code?: string }` for failures and the expected
 * success shape for successes.
 */

import { z } from 'zod';
import { logger } from './logger';

export interface ApiErrorBody {
  error: string;
  code?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const isProd = import.meta.env.PROD || process.env.NODE_ENV === 'production';

/**
 * Default size cap for JSON request bodies. 256 KB is plenty for blog
 * posts, project descriptions, and quiz JSON; oversized bodies are
 * almost always a misconfigured client or an abuse attempt.
 */
export const DEFAULT_BODY_LIMIT = 256 * 1024;

/** Build a successful JSON response with the given data and status (default 200). */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/**
 * Build a standardized error response. `code` is an optional machine-readable
 * tag the client can branch on (e.g. 'INVALID_SLUG', 'NOT_FOUND').
 */
export function errorResponse(message: string, status: number, code?: string): Response {
  const body: ApiErrorBody = code ? { error: message, code } : { error: message };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** Convenience helpers for the most common error cases. */
export const badRequest = (msg: string, code?: string) => errorResponse(msg, 400, code);
export const notFound = (msg: string, code = 'NOT_FOUND') => errorResponse(msg, 404, code);
export const tooLarge = (msg: string, code = 'PAYLOAD_TOO_LARGE') => errorResponse(msg, 413, code);
export const serverError = (msg: string, code = 'SERVER_ERROR') => errorResponse(msg, 500, code);

/**
 * Generic 500 — used by `wrapHandler` so we never leak raw error
 * messages, stack lines, or filesystem paths to clients in production.
 */
const GENERIC_500_BODY = JSON.stringify({
  error: 'Unexpected server error',
  code: 'SERVER_ERROR',
});

/**
 * Parse and validate a JSON request body against a Zod schema, with a
 * pre-flight Content-Length cap to reject oversized bodies before we
 * buffer them in memory.
 *
 * Distinguishes:
 *   - oversized payload     → 413 PAYLOAD_TOO_LARGE
 *   - malformed JSON        → 400 INVALID_JSON
 *   - schema validation     → 400 INVALID_BODY (with per-field issue list)
 *
 * Usage:
 *   const parsed = await parseJsonBody(request, MySchema);
 *   if (parsed instanceof Response) return parsed;
 *   const data = parsed; // fully typed
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  options: { maxBytes?: number } = {},
): Promise<T | Response> {
  const maxBytes = options.maxBytes ?? DEFAULT_BODY_LIMIT;
  const declaredLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (declaredLength > maxBytes) {
    return tooLarge(`Body exceeds ${maxBytes} byte limit`);
  }

  let raw: unknown;
  try {
    // Read as text first so we can enforce the cap even when no
    // Content-Length header is present (e.g. chunked transfer-encoding).
    const text = await request.text();
    if (text.length > maxBytes) {
      return tooLarge(`Body exceeds ${maxBytes} byte limit`);
    }
    raw = text === '' ? undefined : JSON.parse(text);
  } catch {
    return badRequest('Malformed JSON body', 'INVALID_JSON');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return badRequest(`Invalid body: ${issues}`, 'INVALID_BODY');
  }

  return result.data;
}

/**
 * Wrap an admin handler so any unexpected throw becomes a 500 with a
 * consistent shape instead of leaking through as an Astro 500 page.
 *
 * In production the client receives a generic message; the original
 * error message and stack trace are written to the structured logger
 * so we still have the diagnostic detail server-side. In development
 * the original message is returned verbatim so iteration stays fast.
 */
export function wrapHandler(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch((err) => {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    logger.error('admin.api.unhandled', {
      err: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    if (isProd) {
      return new Response(GENERIC_500_BODY, { status: 500, headers: JSON_HEADERS });
    }
    return serverError(msg);
  });
}
