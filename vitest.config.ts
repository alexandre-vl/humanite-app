import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Transforming the modules took half the run, redone on every commit: kept on disk under node_modules, keyed on
    // what each file holds, the suite went from 108 s to 91 s (15/09/2026).
    fsModuleCache: true,
    projects: ['packages/*', 'tools/*'],
  },
});
