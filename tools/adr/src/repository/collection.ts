import type { Diagnostic } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import type { AdrAnalysis } from '../analysis/analyze.ts';
import { analyzeAdr } from '../analysis/analyze.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId } from '../model/identifiers.ts';
import type { CheckCode, ScopedCode } from '../spec/checks.ts';
import { finding } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import { classifyAdrPath } from '../model/paths.ts';
import { ADR_DIRECTORY } from '../spec/layout.ts';
import type { EffectiveStatus } from '../spec/statuses.ts';
import { STATUS_LABELS } from '../spec/statuses.ts';
import type { Snapshot } from './snapshot.ts';

type CollectionCode = ScopedCode<'collection'>;

export type Collection = Readonly<{
  documents: readonly AdrDocument[];
  diagnostics: readonly Diagnostic<CheckCode>[];
}>;

/** Every ADR file of a snapshot, analysed, and the entries that are not ADR files. */
export function readCollection(snapshot: Snapshot, registry: FormatRegistry = FORMAT_REGISTRY): Collection {
  const documents: AdrDocument[] = [];
  const diagnostics: Diagnostic<CheckCode>[] = [];
  for (const entry of snapshot.entries) {
    const path = repoPath(`${ADR_DIRECTORY}/${entry.name}`);
    if (entry.kind === 'directory') {
      diagnostics.push(finding('adr/path-directory', path, {}));
      continue;
    }
    const classified = classifyAdrPath(path);
    if (classified.kind === 'index') {
      continue;
    }
    if (classified.kind !== 'adr') {
      diagnostics.push(finding('adr/path-name', path, {}));
      continue;
    }
    const analysis: AdrAnalysis = analyzeAdr(
      { path, number: classified.number, slug: classified.slug, bytes: entry.bytes },
      registry,
    );
    diagnostics.push(...analysis.diagnostics);
    documents.push(analysis.document);
  }
  return { documents, diagnostics };
}

/** Statuses written in the files, with an accepted ADR turned superseded once an accepted successor lists it. */
export function effectiveStatuses(documents: readonly AdrDocument[]): ReadonlyMap<AdrNumber, EffectiveStatus> {
  const statuses = new Map<AdrNumber, EffectiveStatus>();
  for (const document of documents) {
    if (document.kind === 'readable') {
      statuses.set(document.number, { kind: document.header.status });
    }
  }
  for (const successor of documents) {
    if (successor.kind !== 'readable' || successor.header.status !== 'accepted') {
      continue;
    }
    for (const target of successor.header.supersedes) {
      if (statuses.get(target)?.kind === 'accepted') {
        statuses.set(target, { kind: 'superseded', by: successor.number });
      }
    }
  }
  return statuses;
}

export function checkNumbers(documents: readonly AdrDocument[]): readonly Diagnostic<CollectionCode>[] {
  return [...Map.groupBy(documents, (document) => document.number).values()]
    .filter((group) => group.length > 1)
    .flatMap((group) =>
      group.map((document) =>
        finding('adr/number-duplicate', document.path, {
          id: formatAdrId(document.number),
          paths: group.map((other) => other.path),
        }),
      ),
    );
}

/** Mentions and replacements point at existing ADRs; only an older accepted ADR is replaced, by one accepted ADR. */
export function checkReferences(documents: readonly AdrDocument[]): readonly Diagnostic<CollectionCode>[] {
  const byNumber = new Map(documents.map((document) => [document.number, document]));
  const diagnostics: Diagnostic<CollectionCode>[] = [];
  const acceptedSuccessors = new Map<AdrNumber, AdrNumber[]>();
  for (const document of documents) {
    for (const mention of document.mentions.filter(({ number }) => !byNumber.has(number))) {
      diagnostics.push(
        finding('adr/mention-unknown', document.path, { id: formatAdrId(mention.number) }, mention.position),
      );
    }
    if (document.kind !== 'readable') {
      continue;
    }
    for (const target of document.header.supersedes) {
      const id = formatAdrId(target);
      const replaced = byNumber.get(target);
      if (replaced === undefined) {
        diagnostics.push(finding('adr/supersedes-unknown', document.path, { id }));
      } else if (target >= document.number) {
        diagnostics.push(finding('adr/supersedes-newer', document.path, { id }));
      } else if (replaced.kind === 'readable' && replaced.header.status !== 'accepted') {
        diagnostics.push(
          finding('adr/supersedes-not-accepted', document.path, {
            id,
            status: STATUS_LABELS[replaced.header.status],
          }),
        );
      } else if (document.header.status === 'accepted') {
        acceptedSuccessors.set(target, [...(acceptedSuccessors.get(target) ?? []), document.number]);
      }
    }
  }
  for (const [target, successors] of acceptedSuccessors) {
    const replaced = byNumber.get(target);
    if (replaced !== undefined && successors.length > 1) {
      diagnostics.push(finding('adr/supersedes-several', replaced.path, { successors: successors.map(formatAdrId) }));
    }
  }
  return diagnostics;
}

/** Relative links point at a file or a directory of the repository, from the source being checked. */
export function checkLinkTargets(
  documents: readonly AdrDocument[],
  files: ReadonlySet<RepoPath>,
): readonly Diagnostic<CollectionCode>[] {
  const paths: ReadonlySet<string> = files;
  const directories = new Set<string>();
  for (const file of files) {
    const segments = file.split('/');
    for (let depth = 1; depth < segments.length; depth += 1) {
      directories.add(segments.slice(0, depth).join('/'));
    }
  }
  return documents.flatMap((document) =>
    document.links.flatMap((link) => {
      if (link.target.kind !== 'repository' || paths.has(link.target.path) || directories.has(link.target.path)) {
        return [];
      }
      return [finding('adr/link-target-missing', document.path, { url: link.url }, link.position)];
    }),
  );
}
