import { posix } from 'node:path';
import type { RepoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import type { Bindings } from '../model/bindings.ts';
import { isConvention } from '../model/bindings.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId } from '../model/identifiers.ts';
import { CHECK_CODES, CHECK_SCOPE_LABELS, CHECKS } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import type { RuleLevel } from '../spec/formats/types.ts';
import { RULE_LEVELS } from '../spec/formats/types.ts';
import { SIGNIFICANCE, SIGNIFICANCES } from '../spec/significance.ts';
import type { EffectiveStatus } from '../spec/statuses.ts';
import { STATUS_LABELS, STATUSES, TRANSITIONS } from '../spec/statuses.ts';

export type IndexModel = Readonly<{
  documents: readonly AdrDocument[];
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>;
  bindings: Bindings;
  /** Command that regenerates the page. */
  generator: string;
  bindingsPath: RepoPath;
  formats: FormatRegistry;
}>;

const cell = (text: string): string => text.replaceAll('|', String.raw`\|`);

const code = (text: string): string => `\`${text}\``;

const table = (header: readonly string[], rows: readonly (readonly string[])[]): string[] => [
  `| ${header.join(' | ')} |`,
  `| ${header.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
];

const fileName = (document: AdrDocument): string => posix.basename(document.path);

function statusCell(status: EffectiveStatus | undefined, byNumber: ReadonlyMap<AdrNumber, AdrDocument>): string {
  if (status === undefined) {
    return 'illisible';
  }
  if (status.kind !== 'superseded') {
    return STATUS_LABELS[status.kind];
  }
  const successor = byNumber.get(status.by);
  const id = formatAdrId(status.by);
  return `${STATUS_LABELS.superseded} par ${successor === undefined ? id : `[${id}](${fileName(successor)})`}`;
}

function confirmation(model: IndexModel, ordered: readonly AdrDocument[]): string[] {
  const lines: string[] = [];
  for (const document of ordered) {
    const id = formatAdrId(document.number);
    const binding = model.bindings[id];
    const status = model.statuses.get(document.number);
    if (
      binding === undefined ||
      document.kind !== 'readable' ||
      (status?.kind !== 'accepted' && status?.kind !== 'proposed')
    ) {
      continue;
    }
    const levels = new Map<string, RuleLevel>((document.rules ?? []).map((rule) => [rule.id, rule.level]));
    const rows = Object.entries(binding.rules).map(([rule, ruleBinding]) => {
      const level = levels.get(rule);
      const proof = isConvention(ruleBinding)
        ? `convention : ${ruleBinding.convention}`
        : ruleBinding.map(code).join(', ');
      return [rule, level === undefined ? '?' : document.spec.keywords[level].label, cell(proof)];
    });
    lines.push(
      '',
      `### ${id} · ${cell(document.title)}`,
      '',
      `Statut : ${STATUS_LABELS[status.kind]}. Périmètre : ${binding.scope.paths.map(code).join(', ')}.`,
      '',
      ...table(['Règle', 'Niveau', 'Preuves'], rows),
    );
  }
  return lines.length === 0 ? ['', 'Aucun ADR n’a encore de liens vers ses preuves.'] : lines;
}

/** Markdown of the index of the ADRs, before formatting. */
export function renderIndexPage(model: IndexModel): string {
  const ordered = model.documents.toSorted((left, right) =>
    left.number === right.number ? compareText(left.path, right.path) : left.number - right.number,
  );
  const byNumber = new Map(ordered.map((document) => [document.number, document]));
  return [
    `<!-- Généré par ${model.generator} : ne pas modifier à la main. -->`,
    '',
    '# Décisions d’architecture',
    '',
    `Chaque décision structurante est consignée dans un ADR. Un ADR accepté ou rejeté ne change plus ; ses preuves et son périmètre, qui évoluent avec le code, sont tenus dans ${code(model.bindingsPath)}.`,
    '',
    '## Registre',
    '',
    ...table(
      ['ADR', 'Titre', 'Statut', 'Importance'],
      ordered.map((document) => [
        `[${formatAdrId(document.number)}](${fileName(document)})`,
        document.kind === 'readable' ? cell(document.title) : 'illisible',
        statusCell(model.statuses.get(document.number), byNumber),
        document.kind === 'readable' ? document.header.significance.map(code).join(', ') : '',
      ]),
    ),
    '',
    '## Confirmation',
    ...confirmation(model, ordered),
    '',
    '## Référentiel',
    '',
    '### Statuts',
    '',
    ...table(
      ['Statut', 'Transitions'],
      STATUSES.map((status) => {
        const next: readonly string[] = TRANSITIONS[status];
        return [code(status), next.length === 0 ? 'aucune : le fichier est figé' : next.map(code).join(', ')];
      }),
    ),
    '',
    `Un ADR accepté devient ${code('superseded')}, sans modification de son fichier, dès qu’un ADR accepté le cite dans ${code('supersedes')}.`,
    '',
    '### Importance',
    '',
    ...table(
      ['Valeur', 'Sens', 'Détection'],
      SIGNIFICANCES.map((key) => [
        code(key),
        cell(SIGNIFICANCE[key].label),
        SIGNIFICANCE[key].detection === 'automatic' ? 'automatique' : 'relecture',
      ]),
    ),
    '',
    '### Formats',
    '',
    `Un ADR proposé suit le format ${String(model.formats.latest.version)} ; un ADR décidé reste vérifié selon le format de son en-tête.`,
    ...model.formats.formats.flatMap((format) => [
      '',
      `#### Format ${String(format.version)}`,
      '',
      ...format.sections.map(
        (section, index) =>
          `${String(index + 1)}. ${section.title}${section.key === 'decision' ? `, avec la sous-section ${format.consequences}` : ''}`,
      ),
      '',
      `- Mots-clés des règles : ${RULE_LEVELS.map((level) => `${format.keywords[level].forms.join(', ')}${format.keywords[level].binding ? ' (contraignant)' : ''}`).join(' ; ')}.`,
      `- ${String(format.limits.words)} mots au plus, hors blocs de code ; titre de ${String(format.title.maxCodePoints)} caractères au plus.`,
      `- ${String(format.limits.minOptions)} options étudiées au moins ; ${String(format.limits.maxSupersedes)} ADR remplacés au plus.`,
    ]),
    '',
    '### Contrôles',
    '',
    ...table(
      ['Code', 'Portée', 'Vérifie'],
      CHECK_CODES.map((checkCode) => [
        code(checkCode),
        CHECK_SCOPE_LABELS[CHECKS[checkCode].scope],
        cell(CHECKS[checkCode].summary),
      ]),
    ),
    '',
  ].join('\n');
}
