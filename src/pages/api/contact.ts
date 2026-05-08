import type { APIRoute } from 'astro';
import { jsonResponse, badRequest, parseJsonBody, wrapHandler } from '../../lib/api-response';
import { ContactFormSchema } from '../../lib/contact-schema';
import { storeContactMessage, maskEmail } from '../../lib/contact-store';
import { checkRateLimit } from '../../lib/rate-limit';
import { logger } from '../../lib/logger';

export const prerender = false;

// Anti-spam: 3 successful + failed attempts per IP per hour. Tighter than the
// admin login limit because public form endpoints attract more bots.
const CONTACT_RATE_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

// Reject submissions larger than 10 KB outright — the schema caps message at
// 2000 chars; anything beyond that is bot/scanner traffic.
const MAX_BODY_BYTES = 10 * 1024;

export const POST: APIRoute = ({ request, clientAddress }) =>
  wrapHandler(async () => {
    const ip = clientAddress || 'unknown';

    // Defense-in-depth body size cap (Astro doesn't enforce one by default).
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_BYTES) {
      logger.warn('contact.body_too_large', { ip, bytes: contentLength });
      return badRequest('Request body too large', 'BODY_TOO_LARGE');
    }

    const rl = checkRateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT);
    if (!rl.allowed) {
      logger.warn('contact.rate_limited', { ip, retryAfterSeconds: rl.retryAfterSeconds });
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfterSeconds),
          },
        }
      );
    }

    const body = await parseJsonBody(request, ContactFormSchema);
    if (body instanceof Response) {
      logger.warn('contact.validation_failed', { ip });
      return body;
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const stored = await storeContactMessage(body, { ip, userAgent });

    logger.info('contact.received', {
      id: stored.id,
      ip,
      email: maskEmail(body.email),
      country: body.country,
      messageLen: body.message.length,
    });

    return jsonResponse({ success: true, id: stored.id }, 201);
  });
