import { defineMiddleware } from 'astro:middleware';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function applySecurityHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Protect /admin/* pages, /api/admin/* endpoints, and /_actions/* (all actions are admin-only)
  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/_actions');

  if (!isAdminRoute) {
    return applySecurityHeaders(await next());
  }

  // Allow login page and auth endpoints through (unauthenticated)
  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout'
  ) {
    return next();
  }

  const authenticated = await context.session?.get('authenticated');

  if (!authenticated) {
    // API routes get 401, page routes redirect to login
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/login');
  }

  return applySecurityHeaders(await next());
});
