import { defineMiddleware } from 'astro:middleware';
import { validateSessionToken, COOKIE_NAME } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only protect admin routes (except login page and auth API)
  if (!pathname.startsWith('/admin')) {
    return next();
  }

  // Allow login page and auth endpoints through
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/logout')
  ) {
    return next();
  }

  // Check for session cookie
  const cookies = context.request.headers.get('cookie') || '';
  const sessionMatch = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  const token = sessionMatch?.split('=')[1];
  const secret = import.meta.env.ADMIN_SESSION_SECRET || 'default-secret';

  if (!token || !validateSessionToken(token, secret)) {
    return context.redirect('/admin/login');
  }

  // Authenticated — proceed
  return next();
});
