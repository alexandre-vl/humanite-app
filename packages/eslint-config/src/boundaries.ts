import { fileURLToPath } from 'node:url';
import type { Place } from '@huma/architecture';
import { APP_DIRECTORY, HERMES_FILES, IMPORTS, PLACE_NAMES, PLACES, RESOLUTION } from '@huma/architecture';
import type { Linter } from 'eslint';
import type { TypeScriptResolverOptions } from 'eslint-import-resolver-typescript';
import type { DependenciesPolicy, DependenciesRuleOptions, Settings } from 'eslint-plugin-boundaries';
import { commonJsPlugin } from './plugins.ts';
import type { PolicyId } from './policies.ts';
import { importPolicy, policyMessage } from './policies.ts';

/** The resolver, by absolute path: the isolated linker keeps it out of reach of the plugin's own lookup by name. */
const RESOLVER = fileURLToPath(import.meta.resolve('eslint-import-resolver-typescript'));

type ElementDescriptor = NonNullable<Settings['boundaries/elements']>[number];

type FileDescriptor = NonNullable<Settings['boundaries/files']>[number];

/** One selector of an entity: a place's element, a file category or a module origin. */
type EntitySelector = Exclude<NonNullable<DependenciesPolicy['to']>, readonly unknown[]>;

const oneOf = (names: readonly string[]): string => `@(${names.join('|')})`;

const noneOf = (names: readonly string[]): string => `!(${names.join('|')})`;

/** The element of a place: the folders its code lives in, with the slice, segment or module captured. */
function elementOf(place: Place): ElementDescriptor {
  const { directory, layout, segments } = PLACES[place];
  switch (layout) {
    case 'routes':
    case 'module':
      return { type: place, pattern: directory, partialMatch: false };
    case 'segments':
      return { type: place, pattern: `${directory}/${oneOf(segments)}`, capture: ['segment'], partialMatch: false };
    case 'slices':
      return {
        type: place,
        pattern: `${directory}/${noneOf(segments)}/${oneOf(segments)}`,
        capture: ['slice', 'segment'],
        partialMatch: false,
      };
    case 'modules':
      return { type: place, pattern: `${directory}/*`, capture: ['module'], partialMatch: false };
  }
}

const entryCategory = (place: Place): string => `${place}-entry`;

/** The public entry of a place as a file category, `null` for routes, which nothing imports. */
function entryOf(place: Place): FileDescriptor | null {
  const { directory, layout } = PLACES[place];
  switch (layout) {
    case 'routes':
      return null;
    case 'segments':
    case 'module':
      return { category: entryCategory(place), pattern: `${directory}/index.ts` };
    case 'slices':
      return { category: entryCategory(place), pattern: `${directory}/*/index.ts`, capture: ['slice'] };
    case 'modules':
      return { category: entryCategory(place), pattern: `${directory}/*/index.ts`, capture: ['module'] };
  }
}

/** The files of a place an importer of that place reaches without an entry: its own slice, module or layer. */
function ownFiles(place: Place): readonly EntitySelector[] {
  switch (PLACES[place].layout) {
    case 'routes':
      return [];
    case 'segments':
    case 'module':
      return [{ element: { type: place } }];
    case 'slices':
      return [
        { element: { type: place, captured: { slice: '{{ from.element.captured.slice }}' } } },
        { element: { type: place, captured: { slice: '{{ from.file.captured.slice }}' } } },
      ];
    case 'modules':
      return [{ element: { type: place, captured: { module: '{{ from.element.captured.module }}' } } }];
  }
}

/**
 * The policies of an importer place. The first refuses any local import with the message of the place, the second
 * allows its own files and the entries of the places it imports: the last matching policy wins, so a refused import
 * names the place whose rule it breaks. Without its policy, a place imports any local file.
 */
function placePolicies(place: Place, enabled: ReadonlySet<PolicyId>): readonly DependenciesPolicy[] {
  const entry = entryOf(place);
  const from: EntitySelector[] = [
    { element: { type: place } },
    ...(entry === null ? [] : [{ file: { categories: entryCategory(place) } }]),
  ];
  const allowed: EntitySelector[] = [
    ...ownFiles(place),
    ...IMPORTS[place].map((target: Place) => ({ file: { categories: entryCategory(target) } })),
  ];
  const refusal: DependenciesPolicy = {
    from,
    disallow: { to: { module: { origin: 'local' } } },
    message: policyMessage(importPolicy(place)),
  };
  return enabled.has(importPolicy(place))
    ? [refusal, { from, allow: { to: allowed } }]
    : [{ from, allow: { to: { module: { origin: 'local' } } } }];
}

/**
 * Where the places of the app are and what each may import, enforced by eslint-plugin-boundaries on the Hermes code.
 * A file in no place is unknown; the plugin checks none of its imports, the file itself is refused.
 */
export function boundariesConfig(root: string, enabled: ReadonlySet<PolicyId>): Linter.Config {
  const settings: Settings = {
    'boundaries/root-path': `${root}/${APP_DIRECTORY}`,
    'boundaries/elements': PLACE_NAMES.map(elementOf),
    'boundaries/files': PLACE_NAMES.flatMap((place) => {
      const entry = entryOf(place);
      return entry === null ? [] : [entry];
    }),
    'boundaries/dependency-nodes': ['import', 'export', 'require', 'dynamic-import'],
    'boundaries/legacy-templates': false,
    'boundaries/legacy-warnings': false,
    'boundaries/flag-as-external': { unresolvableAlias: false, inNodeModules: true, outsideRootPath: true },
  };
  const resolver: TypeScriptResolverOptions = {
    tsconfig: { configFile: `${root}/${APP_DIRECTORY}/tsconfig.json` },
    conditionNames: [...RESOLUTION.conditionNames],
    extensions: [...RESOLUTION.extensions],
  };
  const options: DependenciesRuleOptions = {
    default: 'disallow',
    checkAllOrigins: true,
    checkUnknownLocals: true,
    checkInternals: true,
    // Every known file belongs to a place whose policies end in a decision: this message would reveal a place without them.
    message: 'import qu’aucune politique de place ne décide : la table des places est incomplète',
    policies: [
      { allow: { to: { module: { origin: ['external', 'core'] } } } },
      ...PLACE_NAMES.flatMap((place) => placePolicies(place, enabled)),
    ],
  };
  return {
    files: [...HERMES_FILES],
    plugins: { boundaries: commonJsPlugin('eslint-plugin-boundaries') },
    settings: { ...settings, 'import/resolver': { [RESOLVER]: resolver } },
    rules: {
      'boundaries/no-unknown-files': enabled.has('place/unknown-file') ? 'error' : 'off',
      'boundaries/dependencies': ['error', options],
    },
  };
}
