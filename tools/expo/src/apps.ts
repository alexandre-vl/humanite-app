import type { Workspace, WorkspacePackage } from '@huma/deps/workspace';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';

/** The package that makes a workspace package an Expo Router app. */
export const EXPO_ROUTER = 'expo-router';

const declares = (each: WorkspacePackage, name: string): boolean =>
  each.specifiers.dependencies.has(name) || each.specifiers.devDependencies.has(name);

/** The Expo Router apps of a workspace: the packages that depend on `expo-router`. */
export const expoRouterApps = (workspace: Workspace): readonly RepoPath[] =>
  workspace.packages.filter((each) => declares(each, EXPO_ROUTER)).map((each) => repoPath(each.directory));
