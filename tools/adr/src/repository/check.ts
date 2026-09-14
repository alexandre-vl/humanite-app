import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import type { FileSource, GitRepository } from '@huma/kit/git';
import { isWorkTree } from '@huma/kit/git';
import type { Environment } from '@huma/kit/process';
import type { BindingsSource, ProofRunner } from '../model/bindings.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import type { CheckCode } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import type { EffectiveStatus } from '../spec/statuses.ts';
import { checkBindings, checkScopes } from './bindings.ts';
import { checkLinkTargets, checkNumbers, checkReferences, effectiveStatuses, readCollection } from './collection.ts';
import type { Acknowledgment } from './history.ts';
import { checkHistory } from './history.ts';
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

/** Every check of `adr:check` on one source: files, collection, bindings and scopes, then history. */
export async function runChecks(options: CheckOptions): Promise<CheckReport> {
  const formats = options.formats ?? FORMAT_REGISTRY;
  const history = {
    repository: options.repository,
    source: options.source,
    bindings: options.bindings.bindings,
    runProof: options.runProof,
    environment: options.environment,
    acknowledgmentsPath: options.bindings.path,
    formats,
  };
  if (!(await isWorkTree(options.repository))) {
    const diagnostics = await checkHistory({ ...history, documents: [], acknowledgments: [] });
    return { diagnostics, documents: [], statuses: new Map() };
  }
  const snapshot = await readSnapshot(options.repository, options.source);
  const collection = readCollection(snapshot, formats);
  const statuses = effectiveStatuses(collection.documents);
  const diagnostics: Diagnostic<CheckCode>[] = [
    ...collection.diagnostics,
    ...checkNumbers(collection.documents),
    ...checkReferences(collection.documents),
    ...checkLinkTargets(collection.documents, snapshot.files),
    ...checkBindings(collection.documents, statuses, options.bindings),
    ...checkScopes(options.bindings, snapshot.files),
    ...(await checkHistory({
      ...history,
      documents: collection.documents,
      acknowledgments: options.acknowledgments,
    })),
  ];
  return { diagnostics: diagnostics.toSorted(compareDiagnostics), documents: collection.documents, statuses };
}
