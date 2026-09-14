import { posix } from 'node:path';
import type { Diagnostic } from './diagnostics.ts';
import { diagnostic, START } from './diagnostics.ts';
import type { AdrDocument } from './document.ts';
import { analyzeAdr, isExternalLink } from './document.ts';
import type { AdrNumber } from './model.ts';
import { adrNumber, formatAdrId, repoPath } from './model.ts';
import type { Snapshot } from './snapshot.ts';
import { ADR_DIRECTORY, ADR_FILE_NAME, INDEX_FILE } from './spec.ts';

export type Collection = Readonly<{
  documents: readonly AdrDocument[];
  /** Bytes of `docs/adr/README.md`, `null` when the index is missing. */
  index: Uint8Array | null;
  /** Every ADR file was read with a valid front matter and a title: the index can be rendered. */
  complete: boolean;
  diagnostics: readonly Diagnostic[];
}>;

const indexName = INDEX_FILE.slice(ADR_DIRECTORY.length + 1);

export function readCollection(snapshot: Snapshot): Collection {
  const documents: AdrDocument[] = [];
  const diagnostics: Diagnostic[] = [];
  let index: Uint8Array | null = null;
  let complete = true;
  for (const entry of snapshot.entries) {
    const path = repoPath(`${ADR_DIRECTORY}/${entry.name}`);
    if (entry.kind === 'directory') {
      diagnostics.push(diagnostic('adr/path', path, START, 'dossier interdit dans docs/adr'));
      continue;
    }
    if (entry.name === indexName) {
      index = entry.bytes;
      continue;
    }
    const match = ADR_FILE_NAME.exec(entry.name);
    if (match?.[1] === undefined || match[2] === undefined) {
      diagnostics.push(
        diagnostic('adr/path', path, START, 'nom attendu : NNNN-slug.md, slug en minuscules, chiffres et tirets'),
      );
      continue;
    }
    const analysis = analyzeAdr({ path, number: adrNumber(Number(match[1])), slug: match[2], bytes: entry.bytes });
    diagnostics.push(...analysis.diagnostics);
    if (analysis.document === null) {
      complete = false;
    } else {
      documents.push(analysis.document);
      complete &&= analysis.document.frontMatter !== null && analysis.document.title !== null;
    }
  }
  return { documents, index, complete, diagnostics };
}

export type EffectiveStatus =
  Readonly<{ kind: 'proposed' | 'accepted' | 'rejected' }> | Readonly<{ kind: 'superseded'; by: AdrNumber }>;

/** Stored statuses, with `accepted` turned into `superseded` once an accepted ADR lists it in `supersedes`. */
export function effectiveStatuses(documents: readonly AdrDocument[]): ReadonlyMap<AdrNumber, EffectiveStatus> {
  const statuses = new Map<AdrNumber, EffectiveStatus>();
  for (const document of documents) {
    if (document.frontMatter !== null) {
      statuses.set(document.number, { kind: document.frontMatter.status });
    }
  }
  for (const successor of documents) {
    if (successor.frontMatter?.status !== 'accepted') {
      continue;
    }
    for (const target of successor.frontMatter.supersedes) {
      if (statuses.get(target)?.kind === 'accepted') {
        statuses.set(target, { kind: 'superseded', by: successor.number });
      }
    }
  }
  return statuses;
}

export function checkNumbers(documents: readonly AdrDocument[]): readonly Diagnostic[] {
  const byNumber = Map.groupBy(documents, (document) => document.number);
  return [...byNumber.values()]
    .filter((group) => group.length > 1)
    .flatMap((group) =>
      group.map((document) =>
        diagnostic(
          'adr/number-unique',
          document.path,
          START,
          `${formatAdrId(document.number)} porté par ${String(group.length)} fichiers : ${group.map((other) => other.path).join(', ')}`,
        ),
      ),
    );
}

export function checkReferences(documents: readonly AdrDocument[]): readonly Diagnostic[] {
  const code = 'adr/references';
  const byNumber = new Map(documents.map((document) => [document.number, document]));
  const diagnostics: Diagnostic[] = [];
  const acceptedSuccessors = new Map<AdrNumber, AdrNumber[]>();
  for (const document of documents) {
    for (const mention of document.mentions) {
      if (!byNumber.has(mention.number)) {
        diagnostics.push(
          diagnostic(code, document.path, mention.position, `${formatAdrId(mention.number)} n’existe pas`),
        );
      }
    }
    const frontMatter = document.frontMatter;
    if (frontMatter === null) {
      continue;
    }
    for (const target of frontMatter.supersedes) {
      const id = formatAdrId(target);
      const replaced = byNumber.get(target);
      if (replaced === undefined) {
        diagnostics.push(diagnostic(code, document.path, START, `remplace ${id}, qui n’existe pas`));
      } else if (target >= document.number) {
        diagnostics.push(diagnostic(code, document.path, START, `ne peut remplacer que des ADR plus anciens : ${id}`));
      } else if (replaced.frontMatter !== null && replaced.frontMatter.status !== 'accepted') {
        diagnostics.push(diagnostic(code, document.path, START, `seul un ADR accepté peut être remplacé : ${id}`));
      } else if (frontMatter.status === 'accepted') {
        acceptedSuccessors.set(target, [...(acceptedSuccessors.get(target) ?? []), document.number]);
      }
    }
  }
  for (const [target, successors] of acceptedSuccessors) {
    const replaced = byNumber.get(target);
    if (replaced !== undefined && successors.length > 1) {
      diagnostics.push(
        diagnostic(
          code,
          replaced.path,
          START,
          `remplacé par plusieurs ADR acceptés : ${successors.map(formatAdrId).join(', ')}`,
        ),
      );
    }
  }
  return diagnostics;
}

export function checkLinkTargets(documents: readonly AdrDocument[], files: ReadonlySet<string>): readonly Diagnostic[] {
  const code = 'adr/link-target';
  const diagnostics: Diagnostic[] = [];
  for (const document of documents) {
    for (const link of document.links) {
      if (isExternalLink(link.url)) {
        if (!link.url.startsWith('https://')) {
          diagnostics.push(
            diagnostic(code, document.path, link.position, `lien externe en https uniquement : ${link.url}`),
          );
        }
        continue;
      }
      const [target = ''] = link.url.split(/[#?]/u);
      if (target === '') {
        continue;
      }
      const resolved = posix.normalize(posix.join(posix.dirname(document.path), decodeURIComponent(target)));
      const exists =
        !resolved.startsWith('../') &&
        (files.has(resolved) || [...files].some((file) => file.startsWith(`${resolved.replace(/\/$/u, '')}/`)));
      if (!exists) {
        diagnostics.push(
          diagnostic(code, document.path, link.position, `cible introuvable dans le dépôt : ${link.url}`),
        );
      }
    }
  }
  return diagnostics;
}
