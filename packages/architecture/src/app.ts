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
 * the same way — which the tools that build these packages, running on Node, never show. `mock-content` and
 * `remote-api` appear by the files their public entry reaches alone: the rest of the one writes the corpus on Node,
 * and the rest of the other judges the client against a capture, neither ever bundled. Tests are left out, since Vitest
 * runs them on Node, which is where they belong.
 */
export const BUNDLED_FILES: readonly string[] = [
  'packages/contracts/src/**/*.ts',
  'packages/design-tokens/src/**/*.ts',
  'packages/mock-api/src/**/*.ts',
  'packages/mock-content/src/assets.ts',
  'packages/mock-content/src/index.ts',
  'packages/mock-content/src/registries.ts',
  'packages/mock-content/src/generated/**/*.ts',
  'packages/remote-api/src/api.ts',
  'packages/remote-api/src/index.ts',
  'packages/remote-api/src/routes.ts',
  'packages/remote-api/src/transport.ts',
];

/** Route files, as globs relative to the workspace root. */
export const ROUTE_FILES: readonly string[] = [`${APP_DIRECTORY}/${PLACES.route.directory}/**/*.{ts,tsx}`];

/** Public entries of every place, as globs relative to the workspace root. */
export const ENTRY_FILES: readonly string[] = PLACE_NAMES.flatMap((name) => {
  const entry = entryOf(PLACES[name]);
  return entry === null ? [] : [`${APP_DIRECTORY}/${entry}`];
});

/**
 * The theme's trusted core, as paths relative to the workspace root: the context that holds the theme, the root that
 * resolves it from the system scheme, and the scope that hands a named one to a subtree. These three files alone
 * import a frozen theme; every other file receives the theme in force from createStyles, so a component cannot pin a
 * colour that ignores dark mode — and one that wants a theme other than the reader's names it rather than paints it.
 */
export const THEME_FILES: readonly string[] = [
  `${APP_DIRECTORY}/src/shared/lib/styles/theme.tsx`,
  `${APP_DIRECTORY}/src/shared/ui/primitives/theme/theme-root.tsx`,
  `${APP_DIRECTORY}/src/shared/ui/primitives/theme/theme-scope.tsx`,
];

/**
 * Where a query is declared, as globs relative to the workspace root: the `api` segment of a slice. These files alone
 * build query options, so the key of what is asked for and the call that reads it stay in one place, and a screen
 * composes options it did not write in the body of a component.
 *
 * A page has one as well as an entity, and it has to. Two rules of this architecture met over the newsstand and could
 * not both hold: a query lives in an `api` segment, and a slice one single screen refers to lives in that screen
 * (Steiger's `insignificant-slice`, which the shelf tripped the day the sommaire it also fed was taken out). The
 * segment is what the rule was ever about — a `model` that wrote its own options would still be refused, on a page as
 * in an entity — so the layer is what gives way.
 */
export const QUERY_FILES: readonly string[] = [PLACES.entity, PLACES.page].map(
  ({ directory }) => `${APP_DIRECTORY}/${directory}/*/api/*.ts`,
);

/**
 * Where the parameters of a route are read, as globs relative to the workspace root: the routing module of the shared
 * layer. These files alone name the reader Expo Router offers, so a screen receives values an analyser of the contracts
 * has read rather than the strings a route hands over.
 */
export const ROUTING_FILES: readonly string[] = [`${APP_DIRECTORY}/${PLACES.lib.directory}/routing/*.ts`];

/**
 * Where a string may be vouched for as display text, as globs relative to the workspace root. The brand carries no
 * evidence a machine can re-check, so the list says who is trusted to vouch: the dictionary, the formatters it cannot
 * reach, and the module that holds the brander. The rest is dev text belonging to no dictionary — a catalogue naming a
 * component, a probe a test renders — which shows a component rather than the newspaper. What the list leaves out is
 * the point: a screen, a block or an entity that minted its own text would put a reader's words outside the dictionary.
 */
export const DISPLAY_TEXT_FILES: readonly string[] = [
  `${APP_DIRECTORY}/${PLACES.i18n.directory}/translate.ts`,
  `${APP_DIRECTORY}/${PLACES.lib.directory}/display-text/${ENTRY_FILE}`,
  `${APP_DIRECTORY}/${PLACES.lib.directory}/display-text/display-text.ts`,
  `${APP_DIRECTORY}/${PLACES.lib.directory}/format/*.ts`,
  `${APP_DIRECTORY}/src/**/*.catalog.tsx`,
  `${APP_DIRECTORY}/src/**/*.test.{ts,tsx}`,
  `${APP_DIRECTORY}/${PLACES.page.directory}/catalogue/**/*.tsx`,
];

/**
 * The brander's own public door, the one file of the list above that is also the entry of a module. Handing out what
 * the files of its own unit define is what an entry is for, so it is no more laundering than the definition itself —
 * but it has to be named apart, because the rules of an entry are applied after those of a place and would otherwise
 * take back the exemption.
 */
export const DISPLAY_TEXT_ENTRY: readonly string[] = [
  `${APP_DIRECTORY}/${PLACES.lib.directory}/display-text/${ENTRY_FILE}`,
];

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
