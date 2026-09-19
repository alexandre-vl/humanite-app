/**
 * The places of the mobile app: where each kind of code lives, how its files are grouped and which places it may
 * import. Every tool that locates or judges app code derives its configuration from these tables.
 */

/** Segments of a slice, by purpose. */
const SEGMENTS = ['ui', 'model', 'api', 'lib', 'config', 'i18n'] as const;

/** Segments of the `_app` layer: Steiger refuses `ui` there and `providers` as a name (journal 0a, correction 17). */
const APP_SEGMENTS = ['routes', 'model', 'lib', 'config'] as const;

/**
 * Places from top to bottom: a place imports only places of later groups, and the shared places of its own group.
 * Routes come first, since nothing imports them; the shared kernel comes last.
 */
export const ORDER = [
  ['route'],
  ['app'],
  ['page'],
  ['feature'],
  ['entity'],
  ['component'],
  ['primitive'],
  ['lib', 'i18n', 'config', 'api'],
] as const;

type Groups = typeof ORDER;

export type Place = Groups[number][number];

/** Places of the shared kernel, which may import one another along the edges `IMPORTS` lists. */
type KernelPlace = Groups[7][number];

/** The places of the groups after the one holding `Current`. */
type Below<Remaining extends readonly (readonly string[])[], Current extends string> = Remaining extends readonly [
  infer Head extends readonly string[],
  ...infer Rest extends readonly (readonly string[])[],
]
  ? Current extends Head[number]
    ? Rest[number][number]
    : Below<Rest, Current>
  : never;

/** What `Importer` may import: a place below it, or a kernel place when it is one itself. */
export type Importable<Importer extends Place> =
  Below<Groups, Importer> | (Importer extends KernelPlace ? KernelPlace : never);

/** Component levels, from the primitives that alone touch native views to the pages. */
type ComponentLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/**
 * How the files of a place are grouped:
 * - `routes`: any file, each one a route;
 * - `segments`: `<segment>/…` below the place, public entry `index.ts`;
 * - `slices`: `<slice>/<segment>/…`, public entry `<slice>/index.ts`;
 * - `modules`: `<module>/…`, public entry `<module>/index.ts`;
 * - `module`: one module, public entry `index.ts`.
 */
type PlaceLayout = 'routes' | 'segments' | 'slices' | 'modules' | 'module';

export type PlaceSpec = Readonly<{
  /** Directory relative to the app. */
  directory: string;
  layout: PlaceLayout;
  /** Segments allowed below a place laid out in `segments` or `slices`; empty otherwise. */
  segments: readonly string[];
  /** The `#` import of `package.json` that reaches the public entries, `null` for routes, which nothing imports. */
  alias: string | null;
  level: ComponentLevel | null;
  /** Whether a file may have `.ios.tsx` and `.android.tsx` variants beside its default. */
  platformVariants: boolean;
}>;

export const PLACES = {
  route: { directory: 'app', layout: 'routes', segments: [], alias: null, level: null, platformVariants: false },
  app: {
    directory: 'src/_app',
    layout: 'segments',
    segments: APP_SEGMENTS,
    alias: '#app',
    level: null,
    platformVariants: false,
  },
  page: {
    directory: 'src/pages',
    layout: 'slices',
    segments: SEGMENTS,
    alias: '#pages/*',
    level: 'L4',
    platformVariants: false,
  },
  feature: {
    directory: 'src/features',
    layout: 'slices',
    segments: SEGMENTS,
    alias: '#features/*',
    level: 'L3',
    platformVariants: false,
  },
  entity: {
    directory: 'src/entities',
    layout: 'slices',
    segments: SEGMENTS,
    alias: '#entities/*',
    level: 'L2',
    platformVariants: false,
  },
  component: {
    directory: 'src/shared/ui/components',
    layout: 'modules',
    segments: [],
    alias: '#components/*',
    level: 'L1',
    platformVariants: false,
  },
  primitive: {
    directory: 'src/shared/ui/primitives',
    layout: 'modules',
    segments: [],
    alias: '#primitives/*',
    level: 'L0',
    platformVariants: true,
  },
  lib: {
    directory: 'src/shared/lib',
    layout: 'modules',
    segments: [],
    alias: '#lib/*',
    level: null,
    platformVariants: false,
  },
  i18n: {
    directory: 'src/shared/i18n',
    layout: 'module',
    segments: [],
    alias: '#i18n',
    level: null,
    platformVariants: false,
  },
  config: {
    directory: 'src/shared/config',
    layout: 'module',
    segments: [],
    alias: '#config',
    level: null,
    platformVariants: false,
  },
  api: {
    directory: 'src/shared/api',
    layout: 'module',
    segments: [],
    alias: '#api',
    level: null,
    platformVariants: false,
  },
} as const satisfies Readonly<Record<Place, PlaceSpec>>;

/** The places each place may import, downward only: an upward or sideways edge does not compile. */
export const IMPORTS = {
  route: ['app', 'page'],
  app: ['feature', 'entity', 'component', 'primitive', 'lib', 'i18n', 'config', 'api'],
  page: ['feature', 'entity', 'component', 'primitive', 'lib', 'i18n', 'config', 'api'],
  feature: ['entity', 'component', 'primitive', 'lib', 'i18n', 'config', 'api'],
  entity: ['component', 'primitive', 'lib', 'i18n', 'config', 'api'],
  component: ['primitive', 'lib', 'i18n'],
  primitive: ['lib', 'config'],
  lib: ['lib', 'config'],
  i18n: ['lib'],
  config: [],
  api: ['lib', 'config'],
} as const satisfies { readonly [Importer in Place]: readonly Importable<Importer>[] };

/** Every place, top to bottom. */
export const PLACE_NAMES: readonly Place[] = ORDER.flat();

/** A package only some places may import: the rest of the app reaches it through them. */
type ModulePolicy = Readonly<{
  /** Places that may import the package. */
  places: readonly Place[];
  /** Names every place may import from it anyway. */
  except: readonly string[];
}>;

/**
 * Packages whose use the component levels confine: native views, animations and gestures live in L0 primitives,
 * which alone touch the native layer; `Platform` answers a question, not a view, and stays open to every place.
 * Startup modules — font loading and the splash screen — live in the app layer that drives them. The content the app
 * reads enters through the `api` place alone, so swapping the mock for a service touches one module.
 */
export const MODULES = {
  '@huma/mock-api': { places: ['api'], except: [] },
  '@huma/mock-content': { places: ['api'], except: [] },
  '@shopify/flash-list': { places: ['primitive'], except: [] },
  'expo-font': { places: ['app'], except: [] },
  'expo-router': { places: ['app', 'lib', 'page'], except: [] },
  'expo-image': { places: ['primitive'], except: [] },
  'expo-splash-screen': { places: ['app'], except: [] },
  'expo-symbols': { places: ['primitive'], except: [] },
  'react-native': { places: ['primitive'], except: ['Platform'] },
  'react-native-gesture-handler': { places: ['primitive'], except: [] },
  'react-native-mmkv': { places: ['lib'], except: [] },
  'react-native-reanimated': { places: ['primitive'], except: [] },
  'react-native-safe-area-context': { places: ['primitive'], except: [] },
  'react-native-screens': { places: ['primitive'], except: [] },
} as const satisfies Readonly<Record<string, ModulePolicy>>;

export type ConfinedModule = keyof typeof MODULES;

export const CONFINED_MODULES = Object.keys(MODULES).filter((name): name is ConfinedModule =>
  Object.hasOwn(MODULES, name),
);

/** The name of every public entry, which only re-exports what the files of its unit define. */
export const ENTRY_FILE = 'index.ts';
