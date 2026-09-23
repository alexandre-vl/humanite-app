import { copyFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readTextIfExists, temporaryDirectory } from '@huma/kit/fs';
import { compareText } from '@huma/kit/text';
import { isList } from '@huma/unknown';

/**
 * The parts of Expo the repository calls directly, loaded from the Expo an app installs, as its CLI loads them: what
 * they write and what they check is what `expo start` writes and checks, for the same versions. None of them is typed
 * for Expo's users, so each export is checked when it is loaded and each result when it is returned.
 */

/** A route directory as Expo Router's `require.context` lists it: keys only, no route is ever loaded. */
type RouteContext = ((id: string) => never) &
  Readonly<{ keys: () => string[]; resolve: (key: string) => string; id: string }>;

/** Expo's tooling, applied to the app at `appRoot`. */
export type ExpoTooling = Readonly<{
  /** The directory Expo Router reads routes from, relative to the app: `src/app` when it exists, `app` otherwise. */
  routesDirectory: (appRoot: string) => string;
  /** The route files of the routes directory, sorted: Expo lists them in directory order, which varies by disk. */
  routeContext: (appRoot: string) => RouteContext;
  /** Throws the error the app itself throws on an invalid route tree, which the type generator swallows. */
  validateRoutes: (context: RouteContext) => void;
  /** The declaration of typed routes Expo writes to `.expo/types/router.d.ts`. */
  routeTypes: (context: RouteContext) => string;
  /** The fields of the app's `tsconfig.json` Expo rewrites when it sets typed routes up. */
  tsconfigUpdates: (appRoot: string) => Promise<readonly string[]>;
  /** Whether Expo rewrites the app's `.gitignore` when it sets typed routes up. */
  gitignoreUpdated: (appRoot: string) => Promise<boolean>;
}>;

/** The declaration file Expo writes next to the app config, and asks git to ignore. */
const EXPO_ENV_TYPES = 'expo-env.d.ts';

type Callable = (...args: readonly unknown[]) => unknown;

const isCallable = (value: unknown): value is Callable => typeof value === 'function';

const drift = (source: string, what: string): Error =>
  new Error(`${source} ${what} : l’intégration d’Expo est à revoir pour cette version`);

function memberOf(module: unknown, name: string): unknown {
  return (typeof module === 'object' || typeof module === 'function') && module !== null
    ? Reflect.get(module, name)
    : undefined;
}

function exportedFunction(module: unknown, name: string, source: string): Callable {
  const value = memberOf(module, name);
  if (!isCallable(value)) {
    throw drift(source, `n’exporte plus la fonction ${name}`);
  }
  return value;
}

function exportedRegExp(module: unknown, name: string, source: string): RegExp {
  const value = memberOf(module, name);
  if (!(value instanceof RegExp)) {
    throw drift(source, `n’exporte plus l’expression ${name}`);
  }
  return value;
}

function textResult(value: unknown, source: string): string {
  if (typeof value !== 'string') {
    throw drift(source, 'n’a pas rendu de texte');
  }
  return value;
}

function textsResult(value: unknown, source: string): readonly string[] {
  if (!isList(value)) {
    throw drift(source, 'n’a pas rendu de liste');
  }
  return value.map((item) => textResult(item, source));
}

/** The options Expo's own generator passes to `getRoutes`: validation sees the tree the generator sees. */
const TYPED_ROUTE_OPTIONS = {
  ignore: [/_layout\.[tj]sx?$/u],
  platformRoutes: false,
  notFound: false,
  ignoreEntryPoints: true,
  ignoreRequireErrors: true,
  importMode: 'async',
} as const;

const MODULES = {
  routerDirectory: '@expo/cli/build/src/start/server/metro/router',
  tsconfig: '@expo/cli/build/src/start/server/type-generation/tsconfig',
  gitignore: '@expo/cli/build/src/utils/mergeGitIgnorePaths',
  generate: '@expo/router-server/build/typed-routes/generate',
  testing: 'expo-router/internal/testing',
  shared: 'expo-router/_ctx-shared',
  routing: 'expo-router/internal/routing',
} as const;

/**
 * Expo's tooling as the package at `installation` installs it: its CLI, the router server of that CLI and the Expo
 * Router it resolves. The app it then works on may be any directory.
 */
export function loadExpoTooling(installation: string): ExpoTooling {
  const fromPackage = createRequire(join(installation, 'package.json'));
  const fromExpo = createRequire(fromPackage.resolve('expo/package.json'));
  const fromCli = createRequire(fromExpo.resolve('@expo/cli/package.json'));
  const generatePath = fromCli.resolve(MODULES.generate);
  const fromRouterServer = createRequire(generatePath);
  const getRouterDirectory = exportedFunction(
    fromCli(MODULES.routerDirectory),
    'getRouterDirectory',
    MODULES.routerDirectory,
  );
  const getTSConfigUpdates = exportedFunction(fromCli(MODULES.tsconfig), 'getTSConfigUpdates', MODULES.tsconfig);
  const upsertGitIgnore = exportedFunction(fromCli(MODULES.gitignore), 'upsertGitIgnoreContents', MODULES.gitignore);
  const generate = exportedFunction(fromCli(generatePath), 'getTypedRoutesDeclarationFile', MODULES.generate);
  const requireContext = exportedFunction(fromRouterServer(MODULES.testing), 'requireContext', MODULES.testing);
  const routeFiles = exportedRegExp(fromRouterServer(MODULES.shared), 'EXPO_ROUTER_CTX_IGNORE', MODULES.shared);
  const getRoutes = exportedFunction(fromRouterServer(MODULES.routing), 'getRoutes', MODULES.routing);
  const routesDirectory = (appRoot: string): string => textResult(getRouterDirectory(appRoot), MODULES.routerDirectory);
  return {
    routesDirectory,
    routeContext: (appRoot) => {
      const listed = requireContext(join(appRoot, routesDirectory(appRoot)), true, routeFiles);
      const keys = textsResult(exportedFunction(listed, 'keys', MODULES.testing)(), MODULES.testing).toSorted(
        compareText,
      );
      return Object.assign(
        (id: string): never => {
          throw new Error(`une route ne se charge pas pendant la génération de ses types : ${id}`);
        },
        { keys: () => [...keys], resolve: (key: string) => key, id: '0' },
      );
    },
    validateRoutes: (context) => {
      getRoutes(context, TYPED_ROUTE_OPTIONS);
    },
    routeTypes: (context) => textResult(generate(context, {}), MODULES.generate),
    tsconfigUpdates: async (appRoot) => {
      const tsconfig: unknown = JSON.parse(await readFile(join(appRoot, 'tsconfig.json'), 'utf8'));
      const updates = memberOf(getTSConfigUpdates(tsconfig), 'updates');
      return textsResult(updates instanceof Set ? [...updates] : null, MODULES.tsconfig);
    },
    gitignoreUpdated: async (appRoot) => {
      await using scratch = await temporaryDirectory('expo-gitignore');
      const copy = join(scratch.path, '.gitignore');
      if ((await readTextIfExists(join(appRoot, '.gitignore'))) !== null) {
        await copyFile(join(appRoot, '.gitignore'), copy);
      }
      return upsertGitIgnore(copy, EXPO_ENV_TYPES) !== null;
    },
  };
}
