import type { APIRoute } from 'astro';
import { safePasswordCompare } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, session }) => {
  const adminPassword = import.meta.env.ADMIN_PASSWORD;

  // Fail securely if environment is misconfigured
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return new Response('Server configuration error', { status: 500 });
  }

  const formData = await request.formData();
  const password = formData.get('password')?.toString() || '';

  // Use constant-time comparison to prevent timing attacks
  if (!safePasswordCompare(password, adminPassword)) {
    return redirect('/admin/login?error=invalid');
  }

  session?.set('authenticated', true);
  return redirect('/admin');
};
