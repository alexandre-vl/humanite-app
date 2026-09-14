import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BindingsSource } from '@huma/adr/bindings';
import type { CheckReport } from '@huma/adr/check';
import { runChecks } from '@huma/adr/check';
import type { FileSource } from '@huma/kit/git';
import { ownRepository } from '@huma/kit/git';
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

/** Every ADR check of this workspace, from one source, with its proofs and acknowledgments. */
export async function checkWorkspaceAdrs(
  root: string,
  source: FileSource,
  bindings?: BindingsSource,
): Promise<CheckReport> {
  return runChecks({
    repository: ownRepository(root),
    source,
    bindings: bindings ?? (await workspaceBindings(root)),
    runProof,
    environment: process.env,
    acknowledgments: ACKNOWLEDGMENTS,
  });
}
