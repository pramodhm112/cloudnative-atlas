import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Critical-path security and correctness tests live next to the modules
    // they cover. Astro's content collections + .astro pages are tested via
    // the dev server / preview, not vitest.
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    // Reset rate-limit and any other module-level state between files.
    isolate: true,
    // Helpful watch-mode default; use `vitest run` for one-shot CI runs.
    watch: false,
  },
});
