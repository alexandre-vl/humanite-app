import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formatDiagnostic } from '@huma/kit/diagnostics';
import type { GitRepository } from '@huma/kit/git';
import { resolveCommit, stagedPaths, unstagedPaths, worktreeTreeId } from '@huma/kit/git';
import { renderMessage } from '@huma/kit/messages';
import { mapConcurrently } from '@huma/kit/pool';
import type { Environment } from '@huma/kit/process';
import type { RepoPath } from '@huma/kit/paths';
import { agentSessionMarkers } from '@huma/kit/session';
import { analyzeAdr } from '../analysis/analyze.ts';
import type { BindingsSource, ProofRunner } from '../model/bindings.ts';
import { proofsOf } from '../model/bindings.ts';
import { readCanonicalHeader, renderHeader } from '../model/header.ts';
import type { AdrId, AdrNumber } from '../model/identifiers.ts';
import { formatAdrId } from '../model/identifiers.ts';
import { checkBindings } from '../repository/bindings.ts';
import type { CheckReport } from '../repository/check.ts';
import { checkReferences, effectiveStatuses } from '../repository/collection.ts';
import type { DecidedStatus } from '../spec/statuses.ts';
import { INITIAL_STATUS } from '../spec/statuses.ts';

const PROOF_CONCURRENCY = 4;

/** Why a decision is refused, each with its message: nothing is written before every guard passed. */
export const REFUSALS = {
  'agent-session':
    'session d’agent détectée ({markers}) : décider d’un ADR revient au décideur humain, dans son propre terminal',
  'dirty-tree':
    'arbre de travail non propre ({paths}) : la décision se commite seule, sur la version proposée commitée',
  'artifacts-stale': 'fichiers dérivés périmés ({paths}) : lancer pnpm gen et commiter avant de décider',
  'checks-failing': 'adr:check signale des problèmes : les corriger avant de décider',
  'not-found': '{id} introuvable',
  'already-decided': '{id} est déjà {status} : un ADR décidé ne change plus',
  'simulated-findings': '{id} passerait {status} avec des problèmes',
  'proofs-failing': '{id} ne peut pas être accepté : preuves en échec {proofs}',
  'repository-changed': 'le dépôt a changé pendant les vérifications : relancer la décision',
  'post-check-failing': 'la décision écrite ne passe pas adr:check : fichiers remis dans leur état précédent',
} as const satisfies Readonly<Record<string, string>>;

export type RefusalReason = keyof typeof REFUSALS;

/** A file the decision wrote, with its content before, so that a failed decision can put it back. */
export type WrittenFile = Readonly<{ path: RepoPath; previous: string | null }>;

export type DecisionRequest = Readonly<{
  repository: GitRepository;
  number: AdrNumber;
  status: DecidedStatus;
  bindings: BindingsSource;
  runProof: ProofRunner;
  /** Environment of the caller: an agent session is refused. */
  environment: Environment;
  /** Every check on the working tree, with the given bindings. */
  check: (bindings: BindingsSource) => Promise<CheckReport>;
  /** Derived files that differ from their sources. */
  staleArtifacts: () => Promise<readonly RepoPath[]>;
  /** The bindings once the entries of `ids` are gone, without writing anything. */
  withoutBindings: (ids: readonly AdrId[]) => BindingsSource;
  /** Removes the entries of `ids` from the bindings file. */
  removeBindings: (ids: readonly AdrId[]) => Promise<readonly WrittenFile[]>;
  /** Regenerates the derived files. */
  regenerate: () => Promise<readonly WrittenFile[]>;
}>;

export type DecisionOutcome =
  | Readonly<{ kind: 'refused'; reason: RefusalReason; message: string; details: readonly string[] }>
  | Readonly<{
      kind: 'decided';
      id: AdrId;
      path: RepoPath;
      /** Accepted ADRs this decision replaces. */
      supersedes: readonly AdrId[];
      /** Every file the decision wrote, the ADR first. */
      written: readonly RepoPath[];
    }>;

const refused = (
  reason: RefusalReason,
  values: Readonly<Record<string, string | readonly string[]>> = {},
  details: readonly string[] = [],
): DecisionOutcome => ({ kind: 'refused', reason, message: renderMessage(reason, REFUSALS[reason], values), details });

async function writeAtomically(path: string, content: string): Promise<void> {
  const temporary = `${path}.decision-${String(process.pid)}`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

async function restore(root: string, files: readonly WrittenFile[]): Promise<void> {
  for (const file of files.toReversed()) {
    if (file.previous === null) {
      await rm(join(root, file.path), { force: true });
    } else {
      await writeAtomically(join(root, file.path), file.previous);
    }
  }
}

/**
 * Turns a committed, proposed ADR into `accepted` or `rejected` once every guard passed: a human caller, a clean working
 * tree, derived files and checks in step, bindings consistent with the new status and, for an acceptance, every proof
 * passing. The ADRs it supersedes lose their bindings in the same change; a decision that fails its final check is
 * undone.
 */
export async function decide(request: DecisionRequest): Promise<DecisionOutcome> {
  const { repository } = request;
  const markers = agentSessionMarkers(request.environment);
  if (markers.length > 0) {
    return refused('agent-session', { markers });
  }
  const id = formatAdrId(request.number);
  const pending = [...(await stagedPaths(repository)), ...(await unstagedPaths(repository))];
  if (pending.length > 0) {
    return refused('dirty-tree', { paths: pending.slice(0, 5) });
  }
  const head = await resolveCommit(repository, 'HEAD');
  const tree = await worktreeTreeId(repository);
  const stale = await request.staleArtifacts();
  if (stale.length > 0) {
    return refused('artifacts-stale', { paths: stale });
  }
  const before = await request.check(request.bindings);
  if (before.diagnostics.length > 0) {
    return refused('checks-failing', {}, before.diagnostics.map(formatDiagnostic));
  }
  const document = before.documents.find((candidate) => candidate.number === request.number);
  if (document === undefined) {
    return refused('not-found', { id });
  }
  if (document.kind !== 'readable') {
    throw new Error(`${id} illisible alors qu’adr:check ne signale rien`);
  }
  if (document.header.status !== INITIAL_STATUS) {
    return refused('already-decided', { id, status: document.header.status });
  }
  const absolute = join(repository.root, document.path);
  const text = await readFile(absolute, 'utf8');
  const canonical = readCanonicalHeader(text);
  if (canonical === null) {
    throw new Error(`${id} : en-tête non canonique alors qu’adr:check ne signale rien`);
  }

  const decidedText = `${renderHeader({ ...canonical.header, status: request.status })}${text.slice(canonical.length)}`;
  const decided = analyzeAdr({
    path: document.path,
    number: document.number,
    slug: document.slug,
    bytes: new TextEncoder().encode(decidedText),
  }).document;
  const documents = before.documents.map((candidate) => (candidate.number === request.number ? decided : candidate));
  const statuses = effectiveStatuses(documents);
  const supersedes =
    request.status === 'accepted'
      ? canonical.header.supersedes.filter((target) => statuses.get(target)?.kind === 'superseded').map(formatAdrId)
      : [];
  const bindingsAfter = request.withoutBindings(supersedes);
  const simulated = [...checkReferences(documents), ...checkBindings(documents, statuses, bindingsAfter)];
  if (simulated.length > 0) {
    return refused('simulated-findings', { id, status: request.status }, simulated.map(formatDiagnostic));
  }
  if (request.status === 'accepted') {
    const results = await mapConcurrently(proofsOf(bindingsAfter.bindings[id]), PROOF_CONCURRENCY, async (proof) => ({
      proof,
      passed: await request.runProof(proof),
    }));
    const failing = results.filter((result) => !result.passed).map((result) => result.proof);
    if (failing.length > 0) {
      return refused('proofs-failing', { id, proofs: failing });
    }
  }
  if ((await resolveCommit(repository, 'HEAD')) !== head || (await worktreeTreeId(repository)) !== tree) {
    return refused('repository-changed');
  }

  const written: WrittenFile[] = [];
  try {
    await writeAtomically(absolute, decidedText);
    written.push({ path: document.path, previous: text });
    written.push(...(supersedes.length === 0 ? [] : await request.removeBindings(supersedes)));
    written.push(...(await request.regenerate()));
    const after = await request.check(bindingsAfter);
    if (after.diagnostics.length > 0) {
      await restore(repository.root, written);
      return refused('post-check-failing', {}, after.diagnostics.map(formatDiagnostic));
    }
  } catch (error) {
    await restore(repository.root, written);
    throw error;
  }
  return { kind: 'decided', id, path: document.path, supersedes, written: written.map((file) => file.path) };
}
