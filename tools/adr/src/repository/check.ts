import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { isShallow, isWorkTree, resolveCommit } from '@huma/kit/git';
import type { Environment } from '@huma/kit/process';
import { repoPath } from '@huma/kit/paths';
import type { BindingsSource, ProofRunner } from '../model/bindings.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import type { CheckCode } from '../spec/checks.ts';
import { finding } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import { ADR_DIRECTORY } from '../spec/layout.ts';
import type { EffectiveStatus } from '../spec/statuses.ts';
import { checkBindings, checkScopes } from './bindings.ts';
import { checkLinkTargets, checkNumbers, checkReferences, effectiveStatuses, readCollection } from './collection.ts';
import type { Acknowledgment } from './history.ts';
import { checkHistory, committedStates, formatRegressions } from './history.ts';
import type { Snapshot } from './snapshot.ts';
import { readSnapshot } from './snapshot.ts';

export type CheckOptions = Readonly<{
  repository: GitRepository;
  source: FileSource;
  bindings: BindingsSource;
  runProof: ProofRunner;
  environment: Environment;
  acknowledgments: readonly Acknowledgment[];
  formats?: FormatRegistry;
}>;

export type CheckReport = Readonly<{
  diagnostics: readonly Diagnostic<CheckCode>[];
  documents: readonly AdrDocument[];
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>;
}>;

export type SnapshotReport = CheckReport;

/** Every check that reads one snapshot and nothing else: files, collection, bindings and scopes. */
export function checkSnapshot(
  snapshot: Snapshot,
  bindings: BindingsSource,
  formats: FormatRegistry = FORMAT_REGISTRY,
): SnapshotReport {
  const collection = readCollection(snapshot, formats);
  const statuses = effectiveStatuses(collection.documents);
  return {
    documents: collection.documents,
    statuses,
    diagnostics: [
      ...collection.diagnostics,
      ...checkNumbers(collection.documents),
      ...checkReferences(collection.documents),
      ...checkLinkTargets(collection.documents, snapshot.files),
      ...checkBindings(collection.documents, statuses, bindings),
      ...checkScopes(bindings, snapshot.files),
    ],
  };
}

/** Every check of `adr:check` on one source: the snapshot checks, then the history. */
export async function runChecks(options: CheckOptions): Promise<CheckReport> {
  const formats = options.formats ?? FORMAT_REGISTRY;
  const { repository } = options;
  if (!(await isWorkTree(repository))) {
    return {
      diagnostics: [finding('adr/history-not-repository', repoPath(ADR_DIRECTORY), {})],
      documents: [],
      statuses: new Map(),
    };
  }
  const report = checkSnapshot(await readSnapshot(repository, options.source), options.bindings, formats);
  if (await isShallow(repository)) {
    return {
      ...report,
      diagnostics: [...report.diagnostics, finding('adr/history-shallow', repoPath(ADR_DIRECTORY), {})].toSorted(
        compareDiagnostics,
      ),
    };
  }
  const committed = await committedStates(repository, { formats });
  const mergeHead = await resolveCommit(repository, 'MERGE_HEAD');
  const history = await checkHistory({
    source: options.source,
    documents: report.documents,
    committed,
    merging: mergeHead === null ? null : await committedStates(repository, { tip: mergeHead, formats }),
    bindings: options.bindings.bindings,
    runProof: options.runProof,
    environment: options.environment,
    acknowledgments: options.acknowledgments,
    acknowledgmentsPath: options.bindings.path,
  });
  return {
    ...report,
    diagnostics: formatRegressions(report.documents, [...report.diagnostics, ...history], committed).toSorted(
      compareDiagnostics,
    ),
  };
}
