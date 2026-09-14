import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { describeError } from '@huma/kit/errors';
import { readTextIfExists } from '@huma/kit/fs';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import type { ExpoCode } from './checks.ts';
import { expoFinding } from './checks.ts';
import type { ExpoTooling } from './expo.ts';

/** Where the routes of an app live: every file below is a route, and no other directory holds any. */
export const ROUTES_DIRECTORY = 'app';

/** Where Expo writes the route types, which git ignores: generated before every check that reads types. */
export const ROUTE_TYPES_FILE = '.expo/types/router.d.ts';

export type TypedRoutesReport = Readonly<{
  /** Route files the types were generated from. */
  routes: number;
  /** Whether the route types changed on disk. */
  written: boolean;
  diagnostics: readonly Diagnostic<ExpoCode>[];
}>;

const within = (app: RepoPath, path: string): RepoPath => repoPath(`${app}/${path}`);

/**
 * Checks that Expo, setting typed routes up for the app `app` of the workspace at `root`, would read routes from
 * `ROUTES_DIRECTORY` and rewrite no tracked file; then writes the route types exactly as Expo writes them. Nothing is
 * written when a check fails.
 */
export async function syncTypedRoutes(tooling: ExpoTooling, root: string, app: RepoPath): Promise<TypedRoutesReport> {
  const appRoot = join(root, app);
  const directory = tooling.routesDirectory(appRoot);
  if (directory !== ROUTES_DIRECTORY) {
    const details = { directory, expected: ROUTES_DIRECTORY };
    return {
      routes: 0,
      written: false,
      diagnostics: [expoFinding('expo/routes-directory', within(app, directory), details)],
    };
  }
  const diagnostics: Diagnostic<ExpoCode>[] = [];
  const fields = await tooling.tsconfigUpdates(appRoot);
  if (fields.length > 0) {
    diagnostics.push(expoFinding('expo/tsconfig-rewrite', within(app, 'tsconfig.json'), { fields: fields.join(', ') }));
  }
  if (await tooling.gitignoreUpdated(appRoot)) {
    diagnostics.push(expoFinding('expo/gitignore-rewrite', within(app, '.gitignore'), {}));
  }
  const context = tooling.routeContext(appRoot);
  try {
    tooling.validateRoutes(context);
  } catch (error) {
    diagnostics.push(expoFinding('expo/routes-invalid', within(app, directory), { error: describeError(error) }));
  }
  const routes = context.keys().length;
  if (diagnostics.length > 0) {
    return { routes, written: false, diagnostics };
  }
  const target = join(appRoot, ROUTE_TYPES_FILE);
  const types = tooling.routeTypes(context);
  if ((await readTextIfExists(target)) === types) {
    return { routes, written: false, diagnostics };
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, types, 'utf8');
  return { routes, written: true, diagnostics };
}
