import type { Diagnostic } from '@huma/kit/diagnostics';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { firstParentHistory, isShallow, isWorkTree, readObjects, resolveCommit } from '@huma/kit/git';
import { mapConcurrently } from '@huma/kit/pool';
import type { Environment } from '@huma/kit/process';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { agentSessionMarkers } from '@huma/kit/session';
import { compareText } from '@huma/kit/text';
import { analyzeAdr } from '../analysis/analyze.ts';
import type { Bindings, ProofRunner } from '../model/bindings.ts';
import { proofsOf } from '../model/bindings.ts';
import type { AdrDocument, ReadableAdr } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { adrNumber, formatAdrId } from '../model/identifiers.ts';
import type { CheckCode, ScopedCode } from '../spec/checks.ts';
import { finding } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import { ADR_DIRECTORY, ADR_FILE_NAME, NUMBERED_NAME } from '../spec/layout.ts';
import type { Status } from '../spec/statuses.ts';
import { canTransition, INITIAL_STATUS, isDecided, TRANSITIONS } from '../spec/statuses.ts';

type HistoryCode = ScopedCode<'history'>;

/** Where an ADR number stands after a commit, or in the source being checked. */
export type AdrState =
  Readonly<{ kind: 'absent' }> | Readonly<{ kind: 'present'; path: RepoPath; document: AdrDocument }>;

export type CommittedState = Readonly<{ commit: string; authorDate: string; state: AdrState }>;

/** A history finding a maintainer has examined and accepted, with the reason; history cannot be rewritten. */
export type Acknowledgment = Readonly<{ code: CheckCode; commit: string; reason: string }>;

const PROOF_CONCURRENCY = 4;

const DIRECTORY = repoPath(ADR_DIRECTORY);

function numberedFile(path: RepoPath): Readonly<{ number: AdrNumber; slug: string }> | null {
  if (!path.startsWith(`${ADR_DIRECTORY}/`)) {
    return null;
  }
  const name = path.slice(ADR_DIRECTORY.length + 1);
  if (name.includes('/')) {
    return null;
  }
  const strict = ADR_FILE_NAME.exec(name)?.groups;
  const loose = NUMBERED_NAME.exec(name)?.groups;
  const digits = strict?.['number'] ?? loose?.['number'];
  if (digits === undefined) {
    return null;
  }
  return {
    number: adrNumber(Number(digits)),
    slug: strict?.['slug'] ?? name.slice(digits.length + 1).replace(/\.md$/u, ''),
  };
}

/** Every committed state of every ADR number along the first-parent chain of `HEAD`, oldest first. */
export async function committedStates(
  repository: GitRepository,
  registry: FormatRegistry = FORMAT_REGISTRY,
): Promise<ReadonlyMap<AdrNumber, readonly CommittedState[]>> {
  if ((await resolveCommit(repository, 'HEAD')) === null) {
    return new Map();
  }
  const changes = await firstParentHistory(repository, ADR_DIRECTORY);
  const reads = changes.flatMap(({ commit, paths }) =>
    paths.flatMap((path) => {
      const file = numberedFile(path);
      return file === null ? [] : [{ commit, path, ...file }];
    }),
  );
  const objects = await readObjects(
    repository,
    reads.map(({ commit, path }) => `${commit}:${path}`),
  );
  const present = new Map<AdrNumber, Map<RepoPath, AdrDocument>>();
  const timelines = new Map<AdrNumber, CommittedState[]>();
  for (const { commit, authorDate } of changes) {
    const touched = new Set<AdrNumber>();
    for (const read of reads.filter((candidate) => candidate.commit === commit)) {
      const bytes = objects.get(`${read.commit}:${read.path}`) ?? null;
      const paths = present.get(read.number) ?? new Map<RepoPath, AdrDocument>();
      if (bytes === null) {
        paths.delete(read.path);
      } else {
        paths.set(
          read.path,
          analyzeAdr({ path: read.path, number: read.number, slug: read.slug, bytes }, registry).document,
        );
      }
      present.set(read.number, paths);
      touched.add(read.number);
    }
    for (const number of touched) {
      const [first] = [...(present.get(number) ?? new Map<RepoPath, AdrDocument>()).entries()].toSorted(
        ([left], [right]) => compareText(left, right),
      );
      const state: AdrState =
        first === undefined ? { kind: 'absent' } : { kind: 'present', path: first[0], document: first[1] };
      timelines.set(number, [...(timelines.get(number) ?? []), { commit, authorDate, state }]);
    }
  }
  return timelines;
}

const readableStatus = (state: AdrState): Status | null =>
  state.kind === 'present' && state.document.kind === 'readable' ? state.document.frontMatter.status : null;

function checkTimeline(
  number: AdrNumber,
  committed: readonly CommittedState[],
  current: AdrState,
): readonly Diagnostic<HistoryCode>[] {
  const diagnostics: Diagnostic<HistoryCode>[] = [];
  const id = formatAdrId(number);
  const lastPresent = committed.findLast((step) => step.state.kind === 'present')?.state;
  const at: RepoPath =
    current.kind === 'present' ? current.path : lastPresent?.kind === 'present' ? lastPresent.path : DIRECTORY;
  const statuses = [
    ...committed.map((step) => ({ commit: step.commit, status: readableStatus(step.state) })),
    { commit: null, status: readableStatus(current) },
  ].flatMap((step) => (step.status === null ? [] : [{ commit: step.commit, status: step.status }]));

  const [first] = statuses;
  if (first !== undefined && first.status !== INITIAL_STATUS) {
    if (first.commit === null) {
      diagnostics.push(finding('adr/transition-uncommitted', at, { id }));
    } else {
      diagnostics.push(
        finding(
          'adr/transition-first-not-proposed',
          at,
          { id, status: first.status, initial: INITIAL_STATUS },
          undefined,
          first.commit,
        ),
      );
    }
  }
  statuses.forEach((step, index) => {
    const previous = statuses[index - 1];
    if (previous === undefined || previous.status === step.status || canTransition(previous.status, step.status)) {
      return;
    }
    const allowed: readonly Status[] = TRANSITIONS[previous.status];
    diagnostics.push(
      finding(
        'adr/transition-forbidden',
        at,
        { id, from: previous.status, to: step.status, allowed: allowed.length === 0 ? 'aucune' : allowed.join(', ') },
        undefined,
        step.commit,
      ),
    );
  });

  const decided = committed.find((step) => {
    const status = readableStatus(step.state);
    return status !== null && isDecided(status);
  });
  if (current.kind === 'absent') {
    const deletedAfter = committed.findLast((step) => step.state.kind === 'present');
    if (deletedAfter !== undefined) {
      diagnostics.push(finding('adr/deleted', at, { id }, undefined, deletedAfter.commit));
    }
  } else if (decided?.state.kind === 'present') {
    if (current.path !== decided.state.path) {
      diagnostics.push(
        finding('adr/frozen-renamed', current.path, { id, from: decided.state.path }, undefined, decided.commit),
      );
    } else if (current.document.fingerprint !== decided.state.document.fingerprint) {
      diagnostics.push(finding('adr/frozen-modified', current.path, { id }, undefined, decided.commit));
    }
  }
  return diagnostics;
}

export type HistoryInput = Readonly<{
  repository: GitRepository;
  source: FileSource;
  /** Documents of the source being checked. */
  documents: readonly AdrDocument[];
  bindings: Bindings;
  runProof: ProofRunner;
  /** Environment of the check: an index that decides an ADR from an agent session is refused. */
  environment: Environment;
  acknowledgments: readonly Acknowledgment[];
  /** File that lists the acknowledgments, where an unused one is reported. */
  acknowledgmentsPath: RepoPath;
  formats: FormatRegistry;
}>;

/** Decisions staged in the index: readable documents whose status differs from the committed one and is decided. */
function stagedDecisions(
  documents: readonly AdrDocument[],
  committed: ReadonlyMap<AdrNumber, readonly CommittedState[]>,
): readonly ReadableAdr[] {
  return documents.flatMap((document) => {
    if (document.kind !== 'readable' || !isDecided(document.frontMatter.status)) {
      return [];
    }
    const last = committed.get(document.number)?.at(-1);
    return last !== undefined && readableStatus(last.state) === document.frontMatter.status ? [] : [document];
  });
}

/**
 * Transitions, immutability of decided ADRs and deletions along the git history; for an index, the proofs of each
 * staged acceptance and the absence of an agent session behind a staged decision.
 */
export async function checkHistory(input: HistoryInput): Promise<readonly Diagnostic<HistoryCode>[]> {
  if (!(await isWorkTree(input.repository))) {
    return [finding('adr/history-not-repository', DIRECTORY, {})];
  }
  if (await isShallow(input.repository)) {
    return [finding('adr/history-shallow', DIRECTORY, {})];
  }
  const committed = await committedStates(input.repository, input.formats);
  const currentByNumber = new Map<AdrNumber, AdrDocument>();
  for (const document of input.documents.toSorted((left, right) => compareText(left.path, right.path))) {
    if (!currentByNumber.has(document.number)) {
      currentByNumber.set(document.number, document);
    }
  }
  const numbers = new Set([...committed.keys(), ...currentByNumber.keys()]);
  const diagnostics: Diagnostic<HistoryCode>[] = [...numbers].flatMap((number) => {
    const document = currentByNumber.get(number);
    const current: AdrState =
      document === undefined ? { kind: 'absent' } : { kind: 'present', path: document.path, document };
    return checkTimeline(number, committed.get(number) ?? [], current);
  });
  if (input.source === 'index') {
    const staged = stagedDecisions(input.documents, committed);
    const markers = agentSessionMarkers(input.environment);
    for (const document of staged) {
      if (markers.length > 0) {
        diagnostics.push(
          finding('adr/decision-by-agent', document.path, { id: formatAdrId(document.number), markers }),
        );
      }
    }
    const acceptances = staged.filter((document) => document.frontMatter.status === 'accepted');
    for (const document of acceptances) {
      const id = formatAdrId(document.number);
      const proofs = proofsOf(input.bindings[id]);
      const results = await mapConcurrently(proofs, PROOF_CONCURRENCY, async (proof) => ({
        proof,
        passed: await input.runProof(proof),
      }));
      for (const { proof } of results.filter((result) => !result.passed)) {
        diagnostics.push(finding('adr/accept-proof-failing', document.path, { id, proof }));
      }
    }
  }
  const acknowledged = (item: Diagnostic<HistoryCode>): boolean =>
    input.acknowledgments.some(
      (acknowledgment) => acknowledgment.code === item.code && acknowledgment.commit === item.commit,
    );
  const unused = input.acknowledgments.filter(
    (acknowledgment) =>
      !diagnostics.some((item) => item.code === acknowledgment.code && item.commit === acknowledgment.commit),
  );
  return [
    ...diagnostics.filter((item) => !acknowledged(item)),
    ...unused.map((acknowledgment) =>
      finding('adr/acknowledgment-unused', input.acknowledgmentsPath, {
        code: acknowledgment.code,
        commit: acknowledgment.commit,
      }),
    ),
  ];
}
