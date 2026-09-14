import { withoutEntries } from '@huma/adr/bindings';
import type { DecisionOutcome, DecisionRequest } from '@huma/adr/decide';
import { decide } from '@huma/adr/decide';
import { checkArtifacts, writeArtifacts } from './artifacts.ts';
import { removeBindingEntries } from './bindings-file.ts';
import { runProof } from './proofs.ts';
import { checkWorkspaceAdrs, workspaceBindings } from './workspace.ts';

/** What the caller of a workspace decision chooses; the workspace provides everything else. */
export type WorkspaceDecision = Pick<DecisionRequest, 'repository' | 'number' | 'status' | 'environment'>;

/** Decides an ADR of the workspace at the root of `repository`, with its bindings, proofs, checks and derived files. */
export async function decideInWorkspace(request: WorkspaceDecision): Promise<DecisionOutcome> {
  const { repository, environment } = request;
  const { root } = repository;
  const bindings = await workspaceBindings(root);
  return decide({
    ...request,
    bindings,
    runProof,
    check: async (source) => checkWorkspaceAdrs({ repository, environment, source: 'worktree', bindings: source }),
    staleArtifacts: async () => (await checkArtifacts(root)).map((diagnostic) => diagnostic.path),
    withoutBindings: (ids) => withoutEntries(bindings, ids),
    removeBindings: async (ids) => removeBindingEntries(root, ids),
    regenerate: async () => writeArtifacts(root),
  });
}
