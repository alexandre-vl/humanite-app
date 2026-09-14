import type { FileTree } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { lintPolicies } from './eslint.ts';
import { workspaceCopy } from './workspace-copy.ts';

const LINTED = /\.(?:ts|tsx|js|mjs|cjs)$/u;

/** The policies the workspace configuration, restricted to `enabled`, reports on every source file of `tree`. */
export async function lintTree(tree: FileTree, enabled: ReadonlySet<PolicyId>): Promise<readonly PolicyId[]> {
  await using copy = await workspaceCopy(await findWorkspaceRoot(import.meta.dirname), tree);
  const paths = Object.keys(tree).filter((path) => LINTED.test(path));
  return await lintPolicies(copy.root, paths, enabled);
}
