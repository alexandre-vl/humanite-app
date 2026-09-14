import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BindingsSource } from '@huma/adr/bindings';
import type { CheckReport } from '@huma/adr/check';
import { runChecks } from '@huma/adr/check';
import type { FileSource, GitRepository } from '@huma/kit/git';
import type { Environment } from '@huma/kit/process';
import { ACKNOWLEDGMENTS } from './acknowledgments.ts';
import { BINDINGS, BINDINGS_PATH } from './bindings.ts';
import { PROOF_IDS, runProof } from './proofs.ts';

/** The bindings of this workspace, with their file text so that findings point at the right line. */
export async function workspaceBindings(root: string): Promise<BindingsSource> {
  return {
    bindings: BINDINGS,
    path: BINDINGS_PATH,
    text: await readFile(join(root, BINDINGS_PATH), 'utf8'),
    proofs: PROOF_IDS,
  };
}

/** Which files to check, in which repository, for which caller; the bindings default to those of the workspace. */
export type WorkspaceCheck = Readonly<{
  repository: GitRepository;
  source: FileSource;
  /** Environment of the caller: a decision pending from an agent session is reported. */
  environment: Environment;
  bindings?: BindingsSource;
}>;

/** Every ADR check of this workspace, from one source, with its proofs and acknowledgments. */
export async function checkWorkspaceAdrs(request: WorkspaceCheck): Promise<CheckReport> {
  return runChecks({
    repository: request.repository,
    source: request.source,
    bindings: request.bindings ?? (await workspaceBindings(request.repository.root)),
    runProof,
    environment: request.environment,
    acknowledgments: ACKNOWLEDGMENTS,
  });
}
