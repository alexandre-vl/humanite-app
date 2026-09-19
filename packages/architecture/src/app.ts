import type { PlaceSpec } from './places.ts';
import { ENTRY_FILE, PLACE_NAMES, PLACES } from './places.ts';

/** The mobile app, relative to the workspace root. */
export const APP_DIRECTORY = 'apps/mobile';

/** Where the code Metro bundles for Hermes lives, relative to the app: the routes and the layers of `src`. */
export const HERMES_DIRECTORIES = [PLACES.route.directory, 'src'] as const;

/** TypeScript files run by Hermes, as globs relative to the workspace root; any other TypeScript file runs in Node. */
export const HERMES_FILES: readonly string[] = HERMES_DIRECTORIES.map(
  (directory) => `${APP_DIRECTORY}/${directory}/**/*.{ts,tsx}`,
);

/** The public entries of a place, relative to the app, `*` standing for a slice or a module; `null` for routes. */
export function entryOf({ directory, layout }: PlaceSpec): string | null {
  switch (layout) {
    case 'routes':
      return null;
    case 'segments':
    case 'module':
      return `${directory}/${ENTRY_FILE}`;
    case 'slices':
    case 'modules':
      return `${directory}/*/${ENTRY_FILE}`;
  }
}

/**
 * Package sources Metro bundles into the app, as globs relative to the workspace root. The app reaches them through its
 * workspace dependencies, so they run on Hermes exactly like `src` does, and a JavaScript API Hermes lacks fails there
 * the same way — which the tools that build these packages, running on Node, never show. `mock-content` appears by the
 * files its public entry reaches alone: the rest of it writes the corpus on Node and is never bundled. Tests are left
 * out, since Vitest runs them on Node, which is where they belong.
 */
export const BUNDLED_FILES: readonly string[] = [
  'packages/contracts/src/**/*.ts',
  'packages/design-tokens/src/**/*.ts',
  'packages/mock-api/src/**/*.ts',
  'packages/mock-content/src/assets.ts',
  'packages/mock-content/src/index.ts',
  'packages/mock-content/src/registries.ts',
  'packages/mock-content/src/generated/**/*.ts',
];

/** Route files, as globs relative to the workspace root. */
export const ROUTE_FILES: readonly string[] = [`${APP_DIRECTORY}/${PLACES.route.directory}/**/*.{ts,tsx}`];

/** Public entries of every place, as globs relative to the workspace root. */
export const ENTRY_FILES: readonly string[] = PLACE_NAMES.flatMap((name) => {
  const entry = entryOf(PLACES[name]);
  return entry === null ? [] : [`${APP_DIRECTORY}/${entry}`];
});

/**
 * The theme's trusted core, as paths relative to the workspace root: the context that holds the theme and the root that
 * resolves it from the system scheme. These two files alone import a frozen theme; every other file receives the theme
 * in force from createStyles, so a component cannot pin a colour that ignores dark mode.
 */
export const THEME_FILES: readonly string[] = [
  `${APP_DIRECTORY}/src/shared/lib/styles/theme.tsx`,
  `${APP_DIRECTORY}/src/shared/ui/primitives/theme/theme-root.tsx`,
];

/**
 * Where a query is declared, as globs relative to the workspace root: the `api` segment of an entity. These files alone
 * build query options, so the key of an entity and the call that reads it stay in one place, and a screen composes
 * options it did not write.
 */
export const QUERY_FILES: readonly string[] = [`${APP_DIRECTORY}/${PLACES.entity.directory}/*/api/*.ts`];

/**
 * The `imports` field of the app's `package.json`: one `#` alias per importable place, pointing at public entries only,
 * so a file behind an entry cannot even be resolved from outside its slice or module (journal 0a, correction 12).
 */
export function packageImports(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    PLACE_NAMES.flatMap((name) => {
      const spec: PlaceSpec = PLACES[name];
      const entry = entryOf(spec);
      return spec.alias === null || entry === null ? [] : [[spec.alias, `./${entry}`] as const];
    }),
  );
}
