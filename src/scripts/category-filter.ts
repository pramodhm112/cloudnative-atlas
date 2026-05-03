/**
 * Shared client-side category filter for listing pages.
 *
 * Handles: button active states, card visibility via `.hidden` class,
 * and optional URL query-param sync via `history.replaceState`.
 *
 * @param cardSelector CSS selector for the filterable card elements (e.g. '.post-card')
 * @param syncUrl      When true, the active category is reflected in the `?category=` query param
 */
export function initCategoryFilter(cardSelector: string, syncUrl = true): void {
  document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
    const cards = document.querySelectorAll(cardSelector);

    // Only categories that have a button are valid — rejects arbitrary values
    // from a crafted `?category=` URL.
    const validCategories = new Set<string>(
      Array.from(filterButtons)
        .map((b) => b.getAttribute('data-category'))
        .filter((v): v is string => !!v),
    );

    // Counts are rendered server-side by CategoryFilter.astro (see that
    // component's `counts` / `total` props). We no longer inject them from
    // the client — doing so caused a visible CLS on first paint because
    // the pills painted without numbers, then suddenly widened when this
    // script ran on DOMContentLoaded.

    function applyFilter(category: string, updateUrl = false) {
      filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === category);
      });

      cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        card.classList.toggle('hidden', category !== 'All' && cardCategory !== category);
      });

      if (syncUrl && updateUrl) {
        const url = new URL(window.location.href);
        if (category === 'All') {
          url.searchParams.delete('category');
        } else {
          url.searchParams.set('category', category);
        }
        history.replaceState(null, '', url.toString());
      }
    }

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        applyFilter(button.getAttribute('data-category') || 'All', true);
      });
    });

    // On load, apply filter from URL query param (e.g. ?category=DevOps).
    // Reject unknown categories silently to keep the UI consistent.
    if (syncUrl) {
      const urlCategory = new URLSearchParams(window.location.search).get('category');
      if (urlCategory && validCategories.has(urlCategory)) {
        applyFilter(urlCategory);
      }
    }
  });
}
