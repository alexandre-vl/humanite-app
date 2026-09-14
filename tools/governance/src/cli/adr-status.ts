import { parseArgs } from 'node:util';
import type { Bindings } from '@huma/adr/bindings';
import { isConvention } from '@huma/adr/bindings';
import { effectiveStatuses, readCollection } from '@huma/adr/collection';
import type { AdrDocument } from '@huma/adr/document';
import type { CommittedState } from '@huma/adr/history';
import { committedStates } from '@huma/adr/history';
import type { AdrNumber } from '@huma/adr/identifiers';
import { formatAdrId, parseAdrId } from '@huma/adr/identifiers';
import { readSnapshot } from '@huma/adr/snapshot';
import type { EffectiveStatus } from '@huma/adr/statuses';
import { STATUS_LABELS } from '@huma/adr/statuses';
import { findWorkspaceRoot, print, runCommand, UsageError } from '@huma/kit/cli';
import { ownRepository } from '@huma/kit/git';
import { BINDINGS } from '../bindings.ts';

const USAGE = 'Usage : pnpm adr:status [ADR-NNNN]';

const TIME_ZONE = 'Europe/Paris';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: TIME_ZONE });

function describeStatus(status: EffectiveStatus | undefined): string {
  if (status === undefined) {
    return 'illisible';
  }
  return status.kind === 'superseded'
    ? `${STATUS_LABELS.superseded} par ${formatAdrId(status.by)}`
    : STATUS_LABELS[status.kind];
}

/** Since when the written status holds: the first commit that carries it, or the working tree when uncommitted. */
function since(document: AdrDocument, states: readonly CommittedState[]): string {
  if (document.kind !== 'readable') {
    return '';
  }
  const first = states.find(
    ({ state }) =>
      state.kind === 'present' &&
      state.document.kind === 'readable' &&
      state.document.header.status === document.header.status,
  );
  return first === undefined
    ? 'non commité'
    : `depuis le ${dateFormat.format(new Date(first.authorDate))} (${first.commit.slice(0, 7)})`;
}

function details(document: AdrDocument): readonly string[] {
  const bindings: Bindings = BINDINGS;
  const binding = bindings[formatAdrId(document.number)];
  const lines = [
    `Fichier : ${document.path}`,
    `Périmètre : ${binding === undefined ? 'aucun lien' : binding.scope.paths.join(', ')}`,
  ];
  if (document.kind !== 'readable') {
    return lines;
  }
  lines.push(
    `Importance : ${document.header.significance.join(', ')}`,
    `Remplace : ${document.header.supersedes.length === 0 ? 'rien' : document.header.supersedes.map(formatAdrId).join(', ')}`,
  );
  for (const rule of document.rules ?? []) {
    const bound = binding?.rules[rule.id];
    const proof =
      bound === undefined ? '—' : isConvention(bound) ? `convention : ${bound.convention}` : bound.join(', ');
    lines.push(`${rule.id} (${document.spec.keywords[rule.level].label}) : ${proof}`);
  }
  return lines;
}

await runCommand(async () => {
  const { positionals } = parseArgs({ allowPositionals: true, strict: true, options: {} });
  const [id, ...rest] = positionals;
  const wanted: AdrNumber | null = id === undefined ? null : parseAdrId(id);
  if (rest.length > 0 || (id !== undefined && wanted === null)) {
    throw new UsageError(USAGE);
  }
  const repository = ownRepository(await findWorkspaceRoot());
  const collection = readCollection(await readSnapshot(repository, 'worktree'));
  const statuses = effectiveStatuses(collection.documents);
  const history = await committedStates(repository);
  const documents = collection.documents
    .filter((document) => wanted === null || document.number === wanted)
    .toSorted((left, right) => left.number - right.number);
  if (documents.length === 0) {
    print(wanted === null ? 'Aucun ADR.' : `${formatAdrId(wanted)} introuvable.`);
    return wanted === null ? 0 : 1;
  }
  for (const document of documents) {
    const title = document.kind === 'readable' ? document.title : 'titre illisible';
    print(
      `${formatAdrId(document.number)}  ${describeStatus(statuses.get(document.number))}  ${title}  ${since(document, history.get(document.number) ?? [])}`,
    );
    if (wanted !== null) {
      details(document).forEach((line) => {
        print(`  ${line}`);
      });
    }
  }
  return 0;
});
