import { withoutEntries } from '@huma/adr/bindings';
import type { DecisionOutcome, DecisionRequest } from '@huma/adr/decide';
import { decide } from '@huma/adr/decide';
import { checkArtifacts, writeArtifacts } from './artifacts.ts';
import { removeBindingEntries } from './bindings-file.ts';
import { refsForWorktree } from './commit-refs.ts';
import { runProof } from './proofs.ts';
import { checkWorkspaceAdrs, workspaceBindings } from './workspace.ts';

/** What the caller of a workspace decision chooses; the workspace provides everything else. */
export type WorkspaceDecision = Pick<DecisionRequest, 'repository' | 'number' | 'status' | 'environment'>;

/** A decision of the workspace, with the `Refs:` trailers the commit that records it must carry. */
export type WorkspaceOutcome = Readonly<{ outcome: DecisionOutcome; refs: readonly string[] }>;

/** Decides an ADR of the workspace at the root of `repository`, with its bindings, proofs, checks and derived files. */
export async function decideInWorkspace(request: WorkspaceDecision): Promise<WorkspaceOutcome> {
  const { repository, environment } = request;
  const { root } = repository;
  const bindings = await workspaceBindings(root);
  const outcome = await decide({
    ...request,
    bindings,
    runProof,
    check: async (source) => checkWorkspaceAdrs({ repository, environment, source: 'worktree', bindings: source }),
    staleArtifacts: async () => (await checkArtifacts(root)).map((diagnostic) => diagnostic.path),
    withoutBindings: (ids) => withoutEntries(bindings, ids),
    removeBindings: async (ids) => removeBindingEntries(root, ids),
    regenerate: async () => writeArtifacts(root),
  });
  // The trailers are computed from what the decision wrote, and from the statuses it left: an acceptance puts its own
  // ADR in the scope of every accepted ADR that governs `docs/adr/**`, itself included.
  const refs = outcome.kind === 'decided' ? await refsForWorktree(repository, outcome.written, bindings.bindings) : [];
  return { outcome, refs };
}
