/**
 * Shared predicate for "is this content published?".
 *
 * Treats a missing `status` field as `published` so collections without the
 * status field yet (and pre-existing files before the schema was extended)
 * continue to appear. Anything explicitly set to `'draft'` is excluded.
 */

export interface HasOptionalStatus {
  status?: string;
}

/** Returns true when the item should be visible to the public. */
export function isPublished(item: HasOptionalStatus): boolean {
  return (item.status ?? 'published') !== 'draft';
}
