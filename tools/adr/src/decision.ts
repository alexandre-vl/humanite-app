import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CheckReport } from './check.ts';
import { runChecks, writeIndex } from './check.ts';
import { checkReferences, effectiveStatuses } from './collection.ts';
import type { Diagnostic } from './diagnostics.ts';
import { formatDiagnostic } from './diagnostics.ts';
import { analyzeAdr } from './document.ts';
import { serializeFrontMatter } from './frontmatter.ts';
import { git } from './git.ts';
import type { AdrNumber, RepoPath } from './model.ts';
import { formatAdrId, isConvention } from './model.ts';
import type { BindingsSource } from './repository.ts';
import { checkBindings } from './repository.ts';
import type { DecidedStatus } from './spec.ts';

export type DecisionRequest = Readonly<{
  root: string;
  number: AdrNumber;
  status: DecidedStatus;
  bindings: BindingsSource;
  runProof: (proof: string) => Promise<boolean>;
  /** Environment of the process: an agent session is refused. */
  environment: Readonly<Record<string, string | undefined>>;
}>;

export type DecisionOutcome =
  | Readonly<{ kind: 'refused'; reasons: readonly string[] }>
  | Readonly<{ kind: 'decided'; path: RepoPath; title: string; diagnostics: readonly Diagnostic[] }>;

const refused = (...reasons: string[]): DecisionOutcome => ({ kind: 'refused', reasons });

const PROOF_CONCURRENCY = 4;

/** Proofs that do not pass, run at most `PROOF_CONCURRENCY` at a time. */
async function failingProofs(
  proofs: readonly string[],
  runProof: (proof: string) => Promise<boolean>,
): Promise<string[]> {
  const failing = new Set<string>();
  let cursor = 0;
  const work = async (): Promise<void> => {
    while (cursor < proofs.length) {
      const proof = proofs[cursor];
      cursor += 1;
      if (proof !== undefined && !(await runProof(proof))) {
        failing.add(proof);
      }
    }
  };
  await Promise.all(Array.from({ length: PROOF_CONCURRENCY }, work));
  return proofs.filter((proof) => failing.has(proof));
}

/** Markers that Claude Code and other agent runners set in the environment of the commands they launch. */
export const AGENT_ENVIRONMENT_VARIABLES = ['CLAUDECODE', 'AI_AGENT'] as const;

async function committedText(root: string, path: RepoPath): Promise<string | null> {
  try {
    return await git(root, ['show', `HEAD:${path}`]);
  } catch {
    return null;
  }
}

/**
 * Turns a proposed ADR into `accepted` or `rejected` after every guard passed: human caller, clean checks, proposal
 * already committed, bindings consistent with the new statuses and, for an acceptance, every linked proof passing.
 */
export async function decide(request: DecisionRequest): Promise<DecisionOutcome> {
  const agentMarkers = AGENT_ENVIRONMENT_VARIABLES.filter((name) => request.environment[name] !== undefined);
  if (agentMarkers.length > 0) {
    return refused(
      `session d’agent détectée (${agentMarkers.join(', ')}) : décider d’un ADR revient au décideur humain, dans son propre terminal`,
    );
  }
  const id = formatAdrId(request.number);
  const before: CheckReport = await runChecks({
    root: request.root,
    source: 'worktree',
    bindings: request.bindings,
    runProof: request.runProof,
  });
  if (before.diagnostics.length > 0) {
    return refused('corriger d’abord pnpm adr:check :', ...before.diagnostics.map(formatDiagnostic));
  }
  const document = before.collection.documents.find((candidate) => candidate.number === request.number);
  if (document === undefined) {
    return refused(`${id} introuvable dans docs/adr`);
  }
  if (document.frontMatter === null || document.title === null) {
    return refused(`${id} illisible : relancer pnpm adr:check`);
  }
  if (document.frontMatter.status !== 'proposed') {
    return refused(`${id} est déjà ${document.frontMatter.status} : un ADR décidé ne change plus`);
  }
  const committed = await committedText(request.root, document.path);
  if (
    committed === null ||
    analyzeAdr({ ...document, bytes: new TextEncoder().encode(committed) }).document?.frontMatter?.status !== 'proposed'
  ) {
    return refused(`${id} doit d’abord être commité en proposed, tel qu’il sera décidé`);
  }

  const absolute = join(request.root, document.path);
  const text = await readFile(absolute, 'utf8');
  const currentBlock = `---\n${serializeFrontMatter(document.frontMatter)}\n---\n`;
  if (!text.startsWith(currentBlock)) {
    return refused(`${id} : en-tête non canonique, relancer pnpm adr:check`);
  }
  const decidedText = `---\n${serializeFrontMatter({ ...document.frontMatter, status: request.status })}\n---\n${text.slice(currentBlock.length)}`;
  const decided = analyzeAdr({ ...document, bytes: new TextEncoder().encode(decidedText) }).document;
  if (decided === null) {
    return refused(`${id} : relecture impossible après changement de statut`);
  }
  const documents = before.collection.documents.map((candidate) =>
    candidate.number === request.number ? decided : candidate,
  );
  const simulated = [
    ...checkReferences(documents),
    ...checkBindings(documents, effectiveStatuses(documents), request.bindings),
  ];
  if (simulated.length > 0) {
    return refused(`${id} passerait ${request.status} avec des problèmes :`, ...simulated.map(formatDiagnostic));
  }
  if (request.status === 'accepted') {
    const proofs = [
      ...new Set(
        Object.values(request.bindings.bindings[id]?.rules ?? {}).flatMap((binding) =>
          binding === undefined || isConvention(binding) ? [] : binding,
        ),
      ),
    ];
    const failing = await failingProofs(proofs, request.runProof);
    if (failing.length > 0) {
      return refused(`${id} ne peut pas être accepté : preuves en échec ${failing.join(', ')}`);
    }
  }

  await writeFile(absolute, decidedText, 'utf8');
  await writeIndex(request.root, request.bindings.bindings);
  const after = await runChecks({
    root: request.root,
    source: 'worktree',
    bindings: request.bindings,
    runProof: request.runProof,
  });
  return { kind: 'decided', path: document.path, title: document.title, diagnostics: after.diagnostics };
}
