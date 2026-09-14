import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Collection, EffectiveStatus } from './collection.ts';
import { checkLinkTargets, checkNumbers, checkReferences, effectiveStatuses, readCollection } from './collection.ts';
import type { Diagnostic } from './diagnostics.ts';
import { compareDiagnostics, diagnostic, START } from './diagnostics.ts';
import { checkHistory } from './history.ts';
import type { AdrNumber, Bindings } from './model.ts';
import { repoPath } from './model.ts';
import { renderIndex } from './readme.ts';
import type { BindingsSource } from './repository.ts';
import { checkBindings, checkScopes } from './repository.ts';
import type { Source } from './snapshot.ts';
import { readSnapshot } from './snapshot.ts';
import { INDEX_FILE } from './spec.ts';

export type CheckOptions = Readonly<{
  root: string;
  source: Source;
  bindings: BindingsSource;
  runProof: (proof: string) => Promise<boolean>;
}>;

export type CheckReport = Readonly<{
  diagnostics: readonly Diagnostic[];
  collection: Collection;
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>;
}>;

function firstDifferentLine(actual: string, expected: string): number {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  const index = expectedLines.findIndex((line, position) => actualLines[position] !== line);
  return (index === -1 ? expectedLines.length : index) + 1;
}

async function checkIndex(
  root: string,
  collection: Collection,
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>,
  bindings: Bindings,
): Promise<readonly Diagnostic[]> {
  if (!collection.complete) {
    return [];
  }
  const path = repoPath(INDEX_FILE);
  if (collection.index === null) {
    return [diagnostic('adr/index', path, START, 'index absent : lancer pnpm adr:index')];
  }
  const expected = await renderIndex(root, collection.documents, statuses, bindings);
  const actual = new TextDecoder().decode(collection.index);
  return actual === expected
    ? []
    : [
        diagnostic(
          'adr/index',
          path,
          { line: firstDifferentLine(actual, expected), column: 1 },
          'index périmé : lancer pnpm adr:index',
        ),
      ];
}

export async function runChecks(options: CheckOptions): Promise<CheckReport> {
  const snapshot = await readSnapshot(options.root, options.source);
  const collection = readCollection(snapshot);
  const statuses = effectiveStatuses(collection.documents);
  const diagnostics = [
    ...collection.diagnostics,
    ...checkNumbers(collection.documents),
    ...checkReferences(collection.documents),
    ...checkLinkTargets(collection.documents, snapshot.files),
    ...(await checkIndex(options.root, collection, statuses, options.bindings.bindings)),
    ...checkBindings(collection.documents, statuses, options.bindings),
    ...checkScopes(options.bindings, snapshot.files),
    ...(await checkHistory({
      root: options.root,
      source: options.source,
      documents: collection.documents,
      bindings: options.bindings.bindings,
      runProof: options.runProof,
    })),
  ];
  return { diagnostics: diagnostics.toSorted(compareDiagnostics), collection, statuses };
}

/** Rewrites `docs/adr/README.md` from the working tree; refuses while an ADR cannot be read. */
export async function writeIndex(root: string, bindings: Bindings): Promise<void> {
  const collection = readCollection(await readSnapshot(root, 'worktree'));
  if (!collection.complete) {
    throw new Error('Index non régénéré : un ADR a un en-tête ou un titre illisible (voir pnpm adr:check)');
  }
  const content = await renderIndex(root, collection.documents, effectiveStatuses(collection.documents), bindings);
  await writeFile(join(root, INDEX_FILE), content, 'utf8');
}
