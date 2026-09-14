import type { PlaceSpec } from './places.ts';
import { PLACE_NAMES, PLACES } from './places.ts';

/** The mobile app, relative to the workspace root. */
export const APP_DIRECTORY = 'apps/mobile';

/** Where the code Metro bundles for Hermes lives, relative to the app: the routes and the layers of `src`. */
export const HERMES_DIRECTORIES = [PLACES.route.directory, 'src'] as const;

/** TypeScript files run by Hermes, as globs relative to the workspace root; any other TypeScript file runs in Node. */
export const HERMES_FILES: readonly string[] = HERMES_DIRECTORIES.map(
  (directory) => `${APP_DIRECTORY}/${directory}/**/*.{ts,tsx}`,
);

/** The public entries of a place, relative to the app, `*` standing for a slice or a module; `null` for routes. */
function entryOf({ directory, layout }: PlaceSpec): string | null {
  switch (layout) {
    case 'routes':
      return null;
    case 'segments':
    case 'module':
      return `./${directory}/index.ts`;
    case 'slices':
    case 'modules':
      return `./${directory}/*/index.ts`;
  }
}

/**
 * The `imports` field of the app's `package.json`: one `#` alias per importable place, pointing at public entries only,
 * so a file behind an entry cannot even be resolved from outside its slice or module (journal 0a, correction 12).
 */
export function packageImports(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    PLACE_NAMES.flatMap((name) => {
      const spec: PlaceSpec = PLACES[name];
      const entry = entryOf(spec);
      return spec.alias === null || entry === null ? [] : [[spec.alias, entry] as const];
    }),
  );
}
