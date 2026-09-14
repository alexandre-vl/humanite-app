import type { InstallationContext } from '@huma/git-hooks/installation';
import type { ShimCommand } from '@huma/git-hooks/shims';
import { renderShims } from '@huma/git-hooks/shims';
import { ownRepository } from '@huma/kit/git';
import { nodeEntry, PINNED_NODE } from './commands.ts';

/** What every git hook shim of the repository runs, and the command that installs them. */
const SHIM_COMMAND: ShimCommand = {
  node: PINNED_NODE,
  entry: nodeEntry('git:hook'),
  installer: 'pnpm hooks:install',
};

export const SHIMS = renderShims(SHIM_COMMAND);

/**
 * Last commit before the hooks applied: `hooks:check` verifies the message of every first-parent commit after it.
 * Moving it forward hides commits from the check; it only ever names a commit of the default branch.
 */
export const HISTORY_ANCHOR = 'ba99d1673c4dcb03ef87f6f7359d873d1e9c6c91';

/** The repository of the workspace at `root`, and of its other worktrees, as the hooks and their checks see it. */
export const installationContext = (root: string): InstallationContext => ({
  repository: ownRepository(root),
  worktree: (other) => ownRepository(other),
});
