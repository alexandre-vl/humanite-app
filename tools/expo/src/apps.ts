import type { WorkspacePackage } from '@huma/deps/workspace';
import { readWorkspace } from '@huma/deps/workspace';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';

/** The package that makes a workspace package an Expo Router app. */
export const EXPO_ROUTER = 'expo-router';

const declares = (each: WorkspacePackage, name: string): boolean =>
  each.specifiers.dependencies.has(name) || each.specifiers.devDependencies.has(name);

/** The Expo Router apps of the workspace at `root`: the packages that depend on `expo-router`. */
export async function expoRouterApps(root: string): Promise<readonly RepoPath[]> {
  const workspace = await readWorkspace(root);
  return workspace.packages.filter((each) => declares(each, EXPO_ROUTER)).map((each) => repoPath(each.directory));
}
