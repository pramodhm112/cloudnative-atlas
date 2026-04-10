import type { APIRoute } from 'astro';
import { createSessionToken, getSessionCookie } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const password = formData.get('password')?.toString() || '';

  const adminPassword = import.meta.env.ADMIN_PASSWORD || 'admin123';

  if (password !== adminPassword) {
    return redirect('/admin/login?error=invalid');
  }

  const secret = import.meta.env.ADMIN_SESSION_SECRET || 'default-secret';
  const token = createSessionToken(secret);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': getSessionCookie(token),
    },
  });
};
