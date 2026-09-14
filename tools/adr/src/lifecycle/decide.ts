import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { formatDiagnostic } from '@huma/kit/diagnostics';
import type { GitRepository } from '@huma/kit/git';
import { stagedPaths, unstagedPaths } from '@huma/kit/git';
import { mapConcurrently } from '@huma/kit/pool';
import type { Environment } from '@huma/kit/process';
import type { RepoPath } from '@huma/kit/paths';
import { agentSessionMarkers } from '@huma/kit/session';
import { analyzeAdr } from '../analysis/analyze.ts';
import { frontMatterBlock } from '../analysis/frontmatter.ts';
import type { BindingsSource, ProofRunner } from '../model/bindings.ts';
import { proofsOf } from '../model/bindings.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId } from '../model/identifiers.ts';
import { checkBindings } from '../repository/bindings.ts';
import type { CheckReport } from '../repository/check.ts';
import { checkReferences, effectiveStatuses } from '../repository/collection.ts';
import type { CheckCode } from '../spec/checks.ts';
import type { DecidedStatus } from '../spec/statuses.ts';

const PROOF_CONCURRENCY = 4;

export type DecisionRequest = Readonly<{
  repository: GitRepository;
  number: AdrNumber;
  status: DecidedStatus;
  bindings: BindingsSource;
  runProof: ProofRunner;
  /** Environment of the caller: an agent session is refused. */
  environment: Environment;
  /** Every check on the working tree, with the bindings in force. */
  check: () => Promise<CheckReport>;
  /** Regenerates the files derived from the ADRs, the index first. */
  regenerate: () => Promise<void>;
}>;

export type DecisionOutcome =
  | Readonly<{ kind: 'refused'; reasons: readonly string[] }>
  | Readonly<{ kind: 'decided'; path: RepoPath; title: string; diagnostics: readonly Diagnostic<CheckCode>[] }>;

const refused = (...reasons: readonly string[]): DecisionOutcome => ({ kind: 'refused', reasons });

/**
 * Turns a committed, proposed ADR into `accepted` or `rejected` once every guard passed: a human caller, a clean working
 * tree, clean checks, bindings consistent with the new status and, for an acceptance, every proof passing.
 */
export async function decide(request: DecisionRequest): Promise<DecisionOutcome> {
  const markers = agentSessionMarkers(request.environment);
  if (markers.length > 0) {
    return refused(
      `session d’agent détectée (${markers.join(', ')}) : décider d’un ADR revient au décideur humain, dans son propre terminal`,
    );
  }
  const id = formatAdrId(request.number);
  const pending = [...(await stagedPaths(request.repository)), ...(await unstagedPaths(request.repository))];
  if (pending.length > 0) {
    return refused(
      `arbre de travail non propre (${pending.slice(0, 5).join(', ')}) : la décision est commitée seule, dans la version proposée commitée`,
    );
  }
  const before = await request.check();
  if (before.diagnostics.length > 0) {
    return refused('corriger d’abord les problèmes d’adr:check :', ...before.diagnostics.map(formatDiagnostic));
  }
  const document = before.documents.find((candidate) => candidate.number === request.number);
  if (document === undefined) {
    return refused(`${id} introuvable`);
  }
  if (document.kind !== 'readable') {
    return refused(`${id} illisible`);
  }
  if (document.frontMatter.status !== 'proposed') {
    return refused(`${id} est déjà ${document.frontMatter.status} : un ADR décidé ne change plus`);
  }

  const absolute = join(request.repository.root, document.path);
  const text = await readFile(absolute, 'utf8');
  const currentBlock = frontMatterBlock(document.frontMatter);
  if (!text.startsWith(currentBlock)) {
    return refused(`${id} : en-tête non canonique`);
  }
  const decidedText = `${frontMatterBlock({ ...document.frontMatter, status: request.status })}${text.slice(currentBlock.length)}`;
  const decided = analyzeAdr({
    path: document.path,
    number: document.number,
    slug: document.slug,
    bytes: new TextEncoder().encode(decidedText),
  }).document;
  const documents = before.documents.map((candidate) => (candidate.number === request.number ? decided : candidate));
  const simulated = [
    ...checkReferences(documents),
    ...checkBindings(documents, effectiveStatuses(documents), request.bindings),
  ];
  if (simulated.length > 0) {
    return refused(`${id} passerait ${request.status} avec des problèmes :`, ...simulated.map(formatDiagnostic));
  }
  if (request.status === 'accepted') {
    const proofs = proofsOf(request.bindings.bindings[id]);
    const results = await mapConcurrently(proofs, PROOF_CONCURRENCY, async (proof) => ({
      proof,
      passed: await request.runProof(proof),
    }));
    const failing = results.filter((result) => !result.passed).map((result) => result.proof);
    if (failing.length > 0) {
      return refused(`${id} ne peut pas être accepté : preuves en échec ${failing.join(', ')}`);
    }
  }

  await writeFile(absolute, decidedText, 'utf8');
  await request.regenerate();
  const after = await request.check();
  return { kind: 'decided', path: document.path, title: document.title, diagnostics: after.diagnostics };
}
