import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileTree } from '@huma/fixtures';
import { fixtureFactory, writeTree } from '@huma/fixtures';
import { readWorkspace } from '@huma/deps/workspace';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { temporaryDirectory } from '@huma/kit/fs';
import { repoPath } from '@huma/kit/paths';
import { expoRouterApps } from '../apps.ts';
import type { ExpoCode } from '../checks.ts';
import type { ExpoTooling } from '../expo.ts';
import { loadExpoTooling } from '../expo.ts';
import { ROUTE_TYPES_FILE, syncTypedRoutes } from '../typed-routes.ts';

const define = fixtureFactory<ExpoCode>();

/** Expo as the Expo Router app of the workspace installs it: fixtures apply it to their own app trees. */
async function workspaceExpo(): Promise<ExpoTooling> {
  const root = await findWorkspaceRoot(import.meta.dirname);
  const [app] = expoRouterApps(await readWorkspace(root));
  if (app === undefined) {
    throw new Error('aucune app Expo Router dans le workspace : pas d’Expo à charger pour ces fixtures');
  }
  return loadExpoTooling(join(root, app));
}

const APP = repoPath('mobile');

/** An app whose tracked files Expo leaves as they are, with a layout, a home page and an article page. */
const VALID: FileTree = {
  'tsconfig.json': `${JSON.stringify({ include: ['app', '.expo/types/**/*.ts', 'expo-env.d.ts'] })}\n`,
  '.gitignore': '.expo/\nexpo-env.d.ts\n',
  'app/_layout.tsx': '',
  'app/index.tsx': '',
  'app/articles/[id].tsx': '',
};

/** The link type Expo generates for `app/articles/[id].tsx`. */
const ARTICLE_HREF = '`/articles/${Router.SingleRoutePart<T>}';

const synced =
  (tree: FileTree, expectArticleHref = false) =>
  async (): Promise<readonly ExpoCode[]> => {
    await using directory = await temporaryDirectory('expo-fixture');
    await writeTree(join(directory.path, APP), tree);
    const report = await syncTypedRoutes(await workspaceExpo(), { root: directory.path, app: APP, routes: 'app' });
    if (
      expectArticleHref &&
      !(await readFile(join(directory.path, APP, ROUTE_TYPES_FILE), 'utf8')).includes(ARTICLE_HREF)
    ) {
      throw new Error(`les types de routes écrits ne contiennent pas ${ARTICLE_HREF}`);
    }
    return report.diagnostics.map((finding) => finding.code);
  };

/** `tree` without the file at `removed`. */
const without = (tree: FileTree, removed: string): FileTree =>
  Object.fromEntries(Object.entries(tree).filter(([path]) => path !== removed));

export const EXPO_FIXTURES = [
  define(
    'expo/typed-routes',
    'une app dont Expo écrit les types de routes sans toucher un fichier suivi',
    [],
    synced(VALID, true),
  ),
  define(
    'expo/routes-directory',
    'un dossier src/app, qu’Expo Router lirait à la place de app',
    ['expo/routes-directory'],
    synced({ ...VALID, 'src/app/index.tsx': '' }),
  ),
  define(
    'expo/routes-invalid',
    'une route nommée comme un groupe, refusée par Expo Router',
    ['expo/routes-invalid'],
    synced({ ...VALID, 'app/(tabs).tsx': '' }),
  ),
  define(
    'expo/tsconfig-rewrite',
    'un tsconfig.json dont include ne nomme pas expo-env.d.ts',
    ['expo/tsconfig-rewrite'],
    synced({ ...VALID, 'tsconfig.json': `${JSON.stringify({ include: ['app', '.expo/types/**/*.ts'] })}\n` }),
  ),
  define(
    'expo/gitignore-rewrite',
    'une app sans .gitignore, qu’Expo créerait',
    ['expo/gitignore-rewrite'],
    synced(without(VALID, '.gitignore')),
  ),
] as const;
