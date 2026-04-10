import type { APIRoute } from 'astro';
import { getClearSessionCookie } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': getClearSessionCookie(),
    },
  });
};
