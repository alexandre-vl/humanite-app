import type { Diagnostic } from '@huma/kit/diagnostics';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { firstParentHistory, readObjects, resolveCommit } from '@huma/kit/git';
import { mapConcurrently } from '@huma/kit/pool';
import type { Environment } from '@huma/kit/process';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { agentSessionMarkers } from '@huma/kit/session';
import { compareText } from '@huma/kit/text';
import { analyzeAdr } from '../analysis/analyze.ts';
import type { Bindings, ProofRunner } from '../model/bindings.ts';
import { proofsOf } from '../model/bindings.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId } from '../model/identifiers.ts';
import { classifyAdrPath } from '../model/paths.ts';
import type { CheckCode, ScopedCode } from '../spec/checks.ts';
import { CHECKS, finding } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import { ADR_DIRECTORY } from '../spec/layout.ts';
import type { Status } from '../spec/statuses.ts';
import { canTransition, INITIAL_STATUS, isDecided, TRANSITIONS } from '../spec/statuses.ts';

type HistoryCode = ScopedCode<'history'>;

/** Where an ADR number stands after a commit, or in the source being checked. */
type AdrState = Readonly<{ kind: 'absent' }> | Readonly<{ kind: 'present'; path: RepoPath; document: AdrDocument }>;

export type CommittedState = Readonly<{ commit: string; authorDate: string; state: AdrState }>;

/** The committed states of each ADR number along a first-parent chain, oldest first. */
export type Timelines = ReadonlyMap<AdrNumber, readonly CommittedState[]>;

type AdrIdText = `ADR-${string}`;

/** A history finding a maintainer examined and accepted, with the reason: history is never rewritten to hide it. */
export type Acknowledgment =
  | Readonly<{
      code:
        | 'adr/transition-first-not-proposed'
        | 'adr/transition-forbidden'
        | 'adr/deleted'
        | 'adr/number-reused'
        | 'adr/decision-content-changed';
      id: AdrIdText;
      /** The commit the finding points at. */
      commit: string;
      reason: string;
    }>
  | Readonly<{
      code: 'adr/frozen-modified';
      id: AdrIdText;
      /** `sha256:` digest of the one content tolerated: any later change of the file is reported again. */
      digest: string;
      reason: string;
    }>
  | Readonly<{
      code: 'adr/frozen-renamed';
      id: AdrIdText;
      /** The one path tolerated. */
      path: string;
      reason: string;
    }>;

const subjectOf = (acknowledgment: Acknowledgment): string => {
  switch (acknowledgment.code) {
    case 'adr/frozen-modified':
      return acknowledgment.digest;
    case 'adr/frozen-renamed':
      return acknowledgment.path;
    case 'adr/transition-first-not-proposed':
    case 'adr/transition-forbidden':
    case 'adr/deleted':
    case 'adr/number-reused':
    case 'adr/decision-content-changed':
      return acknowledgment.commit;
  }
};

/** A finding and, when an acknowledgment may cover it, the key that acknowledgment must have. */
type HistoryFinding = Readonly<{ diagnostic: Diagnostic<HistoryCode>; key: string | null }>;

const keyOf = (code: CheckCode, id: string, subject: string): string => JSON.stringify([code, id, subject]);

const PROOF_CONCURRENCY = 4;

const DIRECTORY = repoPath(ADR_DIRECTORY);

function numberedFile(path: RepoPath): Readonly<{ number: AdrNumber; slug: string }> | null {
  const classified = classifyAdrPath(path);
  if (classified.kind === 'adr') {
    return { number: classified.number, slug: classified.slug };
  }
  return classified.kind === 'numbered' ? { number: classified.number, slug: '' } : null;
}

/**
 * The state an ADR number reaches among the files that hold it: the file of the previous state while it still exists,
 * so that a second file taking the number never interrupts the history of the first; otherwise the only file, or the
 * first by path.
 */
function nextState(previous: AdrState | undefined, files: ReadonlyMap<RepoPath, AdrDocument>): AdrState {
  const kept = previous?.kind === 'present' && files.has(previous.path) ? previous.path : null;
  const path = kept ?? [...files.keys()].toSorted(compareText)[0];
  const document = path === undefined ? undefined : files.get(path);
  return path === undefined || document === undefined ? { kind: 'absent' } : { kind: 'present', path, document };
}

export type StatesOptions = Readonly<{ tip?: string; formats?: FormatRegistry }>;

/** Every committed state of every ADR number along the first-parent chain of the tip, `HEAD` by default. */
export async function committedStates(repository: GitRepository, options: StatesOptions = {}): Promise<Timelines> {
  const tip = options.tip ?? 'HEAD';
  if ((await resolveCommit(repository, tip)) === null) {
    return new Map();
  }
  const formats = options.formats ?? FORMAT_REGISTRY;
  const changes = await firstParentHistory(repository, { tip, pathspec: ADR_DIRECTORY });
  const reads = changes.flatMap(({ id: commit, paths }) =>
    paths.flatMap((path) => {
      const file = numberedFile(path);
      return file === null ? [] : [{ commit, path, ...file }];
    }),
  );
  const objects = await readObjects(
    repository,
    reads.map(({ commit, path }) => `${commit}:${path}`),
  );
  const readsByCommit = Map.groupBy(reads, (read) => read.commit);
  const files = new Map<AdrNumber, Map<RepoPath, AdrDocument>>();
  const timelines = new Map<AdrNumber, CommittedState[]>();
  for (const { id: commit, authorDate } of changes) {
    const touched = new Set<AdrNumber>();
    for (const read of readsByCommit.get(commit) ?? []) {
      const bytes = objects.get(`${read.commit}:${read.path}`) ?? null;
      const held = files.get(read.number) ?? new Map<RepoPath, AdrDocument>();
      if (bytes === null) {
        held.delete(read.path);
      } else {
        held.set(
          read.path,
          analyzeAdr({ path: read.path, number: read.number, slug: read.slug, bytes }, formats).document,
        );
      }
      files.set(read.number, held);
      touched.add(read.number);
    }
    for (const number of touched) {
      const timeline = timelines.get(number) ?? [];
      const state = nextState(timeline.at(-1)?.state, files.get(number) ?? new Map<RepoPath, AdrDocument>());
      timelines.set(number, [...timeline, { commit, authorDate, state }]);
    }
  }
  return timelines;
}

const statusOf = (state: AdrState): Status | null => (state.kind === 'present' ? state.document.status : null);

type Step = Readonly<{ commit: string | null; state: AdrState }>;

/** Transitions, deletions, reuse of the number, decision content and freezing along the history of one number. */
function checkTimeline(
  number: AdrNumber,
  committed: readonly CommittedState[],
  current: AdrState,
): readonly HistoryFinding[] {
  const id = formatAdrId(number);
  const findings: HistoryFinding[] = [];
  const steps: readonly Step[] = [...committed, { commit: null, state: current }];
  const lastPresent = steps.findLast((step) => step.state.kind === 'present')?.state;
  const at: RepoPath = lastPresent?.kind === 'present' ? lastPresent.path : DIRECTORY;
  const report = (code: HistoryCode, diagnostic: Diagnostic<HistoryCode>, subject: string | null): void => {
    findings.push({ diagnostic, key: subject === null ? null : keyOf(code, id, subject) });
  };

  const statuses = steps.flatMap((step) => {
    const status = statusOf(step.state);
    return status === null ? [] : [{ commit: step.commit, status }];
  });
  const [first] = statuses;
  if (first !== undefined && first.status !== INITIAL_STATUS) {
    if (first.commit === null) {
      report('adr/transition-uncommitted', finding('adr/transition-uncommitted', at, { id }), null);
    } else {
      const details = { id, status: first.status, initial: INITIAL_STATUS };
      report(
        'adr/transition-first-not-proposed',
        finding('adr/transition-first-not-proposed', at, details, undefined, first.commit),
        first.commit,
      );
    }
  }
  statuses.forEach((step, index) => {
    const previous = statuses[index - 1];
    if (previous === undefined || previous.status === step.status || canTransition(previous.status, step.status)) {
      return;
    }
    const allowed: readonly Status[] = TRANSITIONS[previous.status];
    const details = { id, from: previous.status, to: step.status, allowed: allowed.length === 0 ? 'aucune' : allowed };
    report(
      'adr/transition-forbidden',
      finding('adr/transition-forbidden', at, details, undefined, step.commit),
      step.commit,
    );
  });

  let presentPath: RepoPath | null = null;
  let removal: Readonly<{ previous: RepoPath; commit: string | null }> | null = null;
  for (const step of steps) {
    if (step.state.kind === 'absent') {
      if (presentPath !== null && removal === null) {
        removal = { previous: presentPath, commit: step.commit };
      }
      continue;
    }
    if (removal !== null && step.state.path !== removal.previous) {
      const details = { id, path: step.state.path, previous: removal.previous };
      report(
        'adr/number-reused',
        finding('adr/number-reused', step.state.path, details, undefined, step.commit),
        step.commit,
      );
    }
    removal = null;
    presentPath = step.state.path;
  }
  if (current.kind === 'absent' && removal !== null) {
    report('adr/deleted', finding('adr/deleted', at, { id }, undefined, removal.commit), removal.commit);
  }

  const decidedIndex = steps.findIndex((step) => {
    const status = statusOf(step.state);
    return status !== null && isDecided(status);
  });
  const decided = steps[decidedIndex];
  const proposal = steps.slice(0, Math.max(decidedIndex, 0)).findLast((step) => step.state.kind === 'present');
  if (
    decided?.state.kind === 'present' &&
    proposal?.state.kind === 'present' &&
    decided.state.document.fingerprint !== proposal.state.document.fingerprint
  ) {
    const diagnostic = finding('adr/decision-content-changed', decided.state.path, { id }, undefined, decided.commit);
    report('adr/decision-content-changed', diagnostic, decided.commit);
  }

  const frozen = committed.find((step) => {
    const status = statusOf(step.state);
    return status !== null && isDecided(status);
  });
  if (frozen?.state.kind === 'present' && current.kind === 'present') {
    if (current.path !== frozen.state.path) {
      const details = { id, from: frozen.state.path };
      report(
        'adr/frozen-renamed',
        finding('adr/frozen-renamed', current.path, details, undefined, frozen.commit),
        current.path,
      );
    } else if (current.document.fingerprint !== frozen.state.document.fingerprint) {
      const diagnostic = finding('adr/frozen-modified', current.path, { id }, undefined, frozen.commit);
      report('adr/frozen-modified', diagnostic, current.document.digest);
    }
  }
  return findings;
}

/** The current state of each number among the documents of the source, by the same rule as the committed states. */
function currentStates(documents: readonly AdrDocument[], committed: Timelines): ReadonlyMap<AdrNumber, AdrState> {
  const byNumber = Map.groupBy(documents, (document) => document.number);
  const numbers = new Set([...committed.keys(), ...byNumber.keys()]);
  return new Map(
    [...numbers].map((number) => {
      const files = new Map((byNumber.get(number) ?? []).map((document) => [document.path, document]));
      return [number, nextState(committed.get(number)?.at(-1)?.state, files)];
    }),
  );
}

export type HistoryInput = Readonly<{
  source: FileSource;
  /** Documents of the source being checked. */
  documents: readonly AdrDocument[];
  committed: Timelines;
  /** Committed states of the branch being merged, when a merge is in progress: a decision it holds is not pending. */
  merging: Timelines | null;
  bindings: Bindings;
  runProof: ProofRunner;
  /** Environment of the check: a decision pending from an agent session is refused. */
  environment: Environment;
  acknowledgments: readonly Acknowledgment[];
  /** File that lists the acknowledgments, where an unused one is reported. */
  acknowledgmentsPath: RepoPath;
}>;

/** Readable documents whose decided status no commit of the branch, or of the branch being merged, holds yet. */
function pendingDecisions(input: HistoryInput, states: ReadonlyMap<AdrNumber, AdrState>): readonly AdrDocument[] {
  const holds = (timelines: Timelines | null, number: AdrNumber, status: Status): boolean =>
    (timelines?.get(number) ?? []).some((step) => statusOf(step.state) === status);
  return [...states.values()].flatMap((state) => {
    if (state.kind !== 'present' || state.document.status === null || !isDecided(state.document.status)) {
      return [];
    }
    const { number, status } = state.document;
    const lastCommitted = input.committed.get(number)?.at(-1)?.state;
    return (lastCommitted !== undefined && statusOf(lastCommitted) === status) || holds(input.merging, number, status)
      ? []
      : [state.document];
  });
}

/**
 * Transitions, immutability of decided ADRs, deletions and reuse along the git history; a decision pending from an agent
 * session; for an index, the proofs of each staged acceptance.
 */
export async function checkHistory(input: HistoryInput): Promise<readonly Diagnostic<HistoryCode>[]> {
  const states = currentStates(input.documents, input.committed);
  const findings: HistoryFinding[] = [...states].flatMap(([number, state]) =>
    checkTimeline(number, input.committed.get(number) ?? [], state),
  );
  const pending = pendingDecisions(input, states);
  const markers = agentSessionMarkers(input.environment);
  if (markers.length > 0) {
    for (const document of pending) {
      const diagnostic = finding('adr/decision-by-agent', document.path, { id: formatAdrId(document.number), markers });
      findings.push({ diagnostic, key: null });
    }
  }
  if (input.source === 'index') {
    for (const document of pending.filter((candidate) => candidate.status === 'accepted')) {
      const id = formatAdrId(document.number);
      const results = await mapConcurrently(proofsOf(input.bindings[id]), PROOF_CONCURRENCY, async (proof) => ({
        proof,
        passed: await input.runProof(proof),
      }));
      for (const { proof } of results.filter((result) => !result.passed)) {
        findings.push({ diagnostic: finding('adr/accept-proof-failing', document.path, { id, proof }), key: null });
      }
    }
  }
  const keys = new Set(findings.flatMap((item) => (item.key === null ? [] : [item.key])));
  const acknowledged = new Set(input.acknowledgments.map((item) => keyOf(item.code, item.id, subjectOf(item))));
  return [
    ...findings.filter((item) => item.key === null || !acknowledged.has(item.key)).map((item) => item.diagnostic),
    ...input.acknowledgments
      .filter((item) => !keys.has(keyOf(item.code, item.id, subjectOf(item))))
      .map((item) =>
        finding('adr/acknowledgment-unused', input.acknowledgmentsPath, {
          code: item.code,
          id: item.id,
          subject: subjectOf(item),
        }),
      ),
  ];
}

/**
 * Decided ADRs that the current tooling refuses although their content is the decided one: their file findings become
 * one regression of the tooling, so that nobody edits a frozen file to satisfy them.
 */
export function formatRegressions<Code extends CheckCode>(
  documents: readonly AdrDocument[],
  diagnostics: readonly Diagnostic<Code>[],
  committed: Timelines,
): readonly Diagnostic<Code | 'adr/format-regression'>[] {
  const regressed = new Map<RepoPath, AdrDocument>();
  for (const document of documents) {
    const decided = (committed.get(document.number) ?? []).find((step) => {
      const status = statusOf(step.state);
      return status !== null && isDecided(status);
    });
    if (decided?.state.kind === 'present' && decided.state.document.fingerprint === document.fingerprint) {
      regressed.set(document.path, document);
    }
  }
  const isRegressedFinding = (diagnostic: Diagnostic<Code>): boolean =>
    regressed.has(diagnostic.path) && CHECKS[diagnostic.code].scope === 'file';
  const regressions = [...regressed.values()].flatMap((document) => {
    const codes = diagnostics.filter(
      (diagnostic) => diagnostic.path === document.path && isRegressedFinding(diagnostic),
    );
    if (codes.length === 0) {
      return [];
    }
    return [
      finding('adr/format-regression', document.path, {
        id: formatAdrId(document.number),
        format: document.kind === 'readable' ? document.header.format : 'illisible',
        codes: [...new Set(codes.map((diagnostic) => diagnostic.code))],
      }),
    ];
  });
  return [...diagnostics.filter((diagnostic) => !isRegressedFinding(diagnostic)), ...regressions];
}
