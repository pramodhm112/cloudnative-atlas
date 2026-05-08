import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  jsonResponse,
  badRequest,
  notFound,
  parseJsonBody,
  wrapHandler,
} from '../../../../lib/api-response';
import {
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
} from '../../../../lib/contact-store';
import { logger } from '../../../../lib/logger';
import { revalidate } from '../../../../lib/revalidate';

export const prerender = false;

// Message ids are 16-char hex from `crypto.randomBytes(8)`. Anchor strictly
// so an attacker can't sneak path-traversal through the [id] param.
const ID_RE = /^[0-9a-f]{16}$/;

// PATCH-style body — only the `read` flag is mutable from the admin UI.
const UpdateSchema = z.object({
  read: z.boolean(),
});

export const GET: APIRoute = ({ params }) =>
  wrapHandler(async () => {
    const { id } = params;
    if (!id || !ID_RE.test(id)) return badRequest('Invalid id', 'INVALID_ID');

    const message = await getContactMessage(id);
    if (!message) return notFound('Message not found');

    return jsonResponse(message);
  });

export const PUT: APIRoute = ({ params, request }) =>
  wrapHandler(async () => {
    const { id } = params;
    if (!id || !ID_RE.test(id)) return badRequest('Invalid id', 'INVALID_ID');

    const body = await parseJsonBody(request, UpdateSchema);
    if (body instanceof Response) return body;

    const updated = await updateContactMessage(id, { read: body.read });
    if (!updated) return notFound('Message not found');

    logger.info('admin.message.updated', { id, read: updated.read });
    return jsonResponse({ success: true, id });
  });

export const DELETE: APIRoute = ({ params }) =>
  wrapHandler(async () => {
    const { id } = params;
    if (!id || !ID_RE.test(id)) return badRequest('Invalid id', 'INVALID_ID');

    const deleted = await deleteContactMessage(id);
    if (!deleted) return notFound('Message not found');

    logger.info('admin.message.deleted', { id });
    // Admin-only route, but the unread-count badge on /admin uses
    // server-rendered HTML so a revalidate refreshes that.
    await revalidate(`messages.delete:${id}`);
    return jsonResponse({ success: true });
  });
