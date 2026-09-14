import { parseArgs } from 'node:util';
import type { EffectiveStatus } from '../collection.ts';
import { effectiveStatuses, readCollection } from '../collection.ts';
import type { AdrDocument } from '../document.ts';
import { isRepository } from '../git.ts';
import type { Observation } from '../history.ts';
import { observe } from '../history.ts';
import type { AdrNumber, Bindings } from '../model.ts';
import { formatAdrId, isConvention, parseAdrId } from '../model.ts';
import { readSnapshot } from '../snapshot.ts';
import { TIME_ZONE } from '../spec.ts';
import { findRoot, UsageError } from './root.ts';
import { bindingsSource, print, runCommand } from './shared.ts';

const USAGE = 'Usage : pnpm adr:status [ADR-NNNN]';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: TIME_ZONE });

function describeStatus(status: EffectiveStatus | undefined): string {
  switch (status?.kind) {
    case undefined:
      return 'illisible';
    case 'proposed':
      return 'proposé';
    case 'accepted':
      return 'accepté';
    case 'rejected':
      return 'rejeté';
    case 'superseded':
      return `remplacé par ${formatAdrId(status.by)}`;
  }
}

/** Since when the stored status holds: the first commit that carries it, or the working tree when uncommitted. */
function since(document: AdrDocument, observations: readonly Observation[]): string {
  const status = document.frontMatter?.status;
  const first = observations.find(
    (observation) => observation.number === document.number && observation.status === status,
  );
  return first === undefined
    ? 'non commité'
    : `depuis le ${dateFormat.format(new Date(first.authorDate))} (${first.commit.slice(0, 7)})`;
}

function details(document: AdrDocument, bindings: Bindings): string[] {
  const binding = bindings[formatAdrId(document.number)];
  const lines = [
    `Fichier : ${document.path}`,
    `Importance : ${(document.frontMatter?.significance ?? []).join(', ')}`,
    `Remplace : ${(document.frontMatter?.supersedes ?? []).length === 0 ? 'rien' : (document.frontMatter?.supersedes ?? []).map(formatAdrId).join(', ')}`,
    `Périmètre : ${binding === undefined ? 'aucun lien dans tools/adr/src/bindings.ts' : binding.scope.join(', ')}`,
  ];
  for (const rule of document.rules ?? []) {
    const ruleBinding = binding?.rules[rule.id];
    const proof =
      ruleBinding === undefined
        ? '—'
        : isConvention(ruleBinding)
          ? `convention : ${ruleBinding.convention}`
          : ruleBinding.join(', ');
    lines.push(`${rule.id} (${rule.level ?? '?'}) : ${proof}`);
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
  const root = await findRoot();
  const collection = readCollection(await readSnapshot(root, 'worktree'));
  const statuses = effectiveStatuses(collection.documents);
  const observations = (await isRepository(root)) ? await observe(root) : [];
  const { bindings } = await bindingsSource(root);
  const documents = collection.documents
    .filter((document) => wanted === null || document.number === wanted)
    .toSorted((left, right) => left.number - right.number);
  if (documents.length === 0) {
    print(wanted === null ? 'Aucun ADR.' : `${formatAdrId(wanted)} introuvable.`);
    return wanted === null ? 0 : 1;
  }
  for (const document of documents) {
    print(
      `${formatAdrId(document.number)}  ${describeStatus(statuses.get(document.number))}  ${document.title ?? 'titre illisible'}  ${since(document, observations)}`,
    );
    if (wanted !== null) {
      details(document, bindings).forEach((line) => {
        print(`  ${line}`);
      });
    }
  }
  return 0;
});
