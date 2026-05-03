/**
 * Shared slug validation and generation utilities.
 *
 * Used by content-manager.ts (blog/projects/tests), course-manager.ts,
 * and admin API route handlers that accept slug parameters.
 */

/**
 * Safe-slug pattern: lowercase letters and digits, separated by single hyphens,
 * starting and ending with an alphanumeric. Length bounds are enforced separately.
 */
export const SAFE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Maximum allowed length for a slug path segment. */
export const MAX_SLUG_LENGTH = 100;

/**
 * Throws if `slug` is not safe to use as a filesystem path component.
 *
 * Rejects: empty, >100 chars, path-traversal sequences (`..`, `/`, `\\`),
 * or anything that doesn't match SAFE_SLUG_PATTERN.
 */
export function validateSlug(slug: string): void {
  if (!slug || slug.length > MAX_SLUG_LENGTH) {
    throw new Error(`Invalid slug: must be 1-${MAX_SLUG_LENGTH} characters`);
  }
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new Error('Invalid slug: contains path traversal characters');
  }
  if (!SAFE_SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid slug: must contain only lowercase letters, numbers, and hyphens');
  }
}

/**
 * Returns true if `slug` passes validateSlug (non-throwing variant).
 * Prefer this in conditional logic; prefer validateSlug when an error
 * response is desired.
 */
export function isValidSlug(slug: string): boolean {
  try {
    validateSlug(slug);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a title into a URL-safe slug. Falls back to a deterministic
 * fallback when the title produces no valid characters (e.g. non-ASCII).
 */
export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);

  if (!slug) {
    return `untitled-${Date.now().toString(36)}`;
  }
  return slug;
}
