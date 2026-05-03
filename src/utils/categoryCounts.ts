/**
 * Count items per category, returning a plain Record for fast lookup.
 *
 * Used by listing-page frontmatters to pre-compute counts for <CategoryFilter>
 * at build/request time — so the filter pills paint with their numbers in
 * the first frame and there's no CLS when the client-side filter script runs.
 *
 * @param items       Collection of items (posts, tests, courses, projects)
 * @param getCategory Accessor that returns the item's category name
 */
export function computeCategoryCounts<T>(
  items: readonly T[],
  getCategory: (item: T) => string | null | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const cat = getCategory(item);
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
}
