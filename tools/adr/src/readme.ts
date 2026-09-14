import { join, posix } from 'node:path';
import { format, resolveConfig } from 'prettier';
import type { EffectiveStatus } from './collection.ts';
import { CHECK_CODES, CHECKS } from './diagnostics.ts';
import type { AdrDocument } from './document.ts';
import type { AdrNumber, Bindings } from './model.ts';
import { formatAdrId, isConvention } from './model.ts';
import type { RuleLevel } from './spec.ts';
import {
  ADR_DIRECTORY,
  CONSEQUENCES_TITLE,
  INDEX_FILE,
  LIMITS,
  SECTION_ORDER,
  SECTIONS,
  SIGNIFICANCE,
  SIGNIFICANCES,
  STATUSES,
  TRANSITIONS,
} from './spec.ts';

const LEVEL_WORDS: Readonly<Record<RuleLevel, string>> = { must: 'DOIT', 'must-not': 'NE DOIT PAS', may: 'PEUT' };

const SCOPE_WORDS: Readonly<Record<(typeof CHECKS)[keyof typeof CHECKS]['scope'], string>> = {
  file: 'fichier',
  collection: 'collection',
  repository: 'dépôt',
  history: 'historique',
};

const cell = (text: string): string => text.replaceAll('|', String.raw`\|`);

const code = (text: string): string => `\`${text}\``;

const fileName = (document: AdrDocument): string => posix.basename(document.path);

function statusCell(status: EffectiveStatus | undefined, documents: ReadonlyMap<AdrNumber, AdrDocument>): string {
  switch (status?.kind) {
    case undefined:
      return 'illisible';
    case 'proposed':
      return 'proposé';
    case 'accepted':
      return 'accepté';
    case 'rejected':
      return 'rejeté';
    case 'superseded': {
      const successor = documents.get(status.by);
      const id = formatAdrId(status.by);
      return `remplacé par ${successor === undefined ? id : `[${id}](${fileName(successor)})`}`;
    }
  }
}

const table = (header: readonly string[], rows: readonly (readonly string[])[]): string[] => [
  `| ${header.join(' | ')} |`,
  `| ${header.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
];

function confirmation(
  documents: readonly AdrDocument[],
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>,
  bindings: Bindings,
): string[] {
  const lines: string[] = [];
  for (const document of documents) {
    const binding = bindings[formatAdrId(document.number)];
    const status = statuses.get(document.number);
    if (binding === undefined || (status?.kind !== 'accepted' && status?.kind !== 'proposed')) {
      continue;
    }
    const levels = new Map<string, RuleLevel | null>((document.rules ?? []).map((rule) => [rule.id, rule.level]));
    const rules = Object.entries(binding.rules).flatMap(([rule, ruleBinding]) => {
      if (ruleBinding === undefined) {
        return [];
      }
      const level = levels.get(rule);
      const proof = isConvention(ruleBinding)
        ? `convention : ${ruleBinding.convention}`
        : ruleBinding.map(code).join(', ');
      return [[rule, level === undefined || level === null ? '?' : LEVEL_WORDS[level], cell(proof)]];
    });
    lines.push(
      '',
      `### ${formatAdrId(document.number)} · ${cell(document.title ?? '')}`,
      '',
      `Statut : ${status.kind === 'accepted' ? 'accepté' : 'proposé'}. Périmètre : ${binding.scope.map(code).join(', ')}.`,
      '',
      ...table(['Règle', 'Niveau', 'Preuves'], rules),
    );
  }
  return lines.length === 0 ? ['', 'Aucun ADR n’a encore de liens vers ses preuves.'] : lines;
}

/** Markdown of `docs/adr/README.md`, formatted by the repository's Prettier configuration. */
export async function renderIndex(
  root: string,
  documents: readonly AdrDocument[],
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>,
  bindings: Bindings,
): Promise<string> {
  const ordered = documents.toSorted((left, right) =>
    left.number === right.number ? (left.path < right.path ? -1 : 1) : left.number - right.number,
  );
  const byNumber = new Map(ordered.map((document) => [document.number, document]));
  const markdown = [
    `<!-- Généré par pnpm adr:index depuis ${ADR_DIRECTORY}, tools/adr/src/spec.ts et tools/adr/src/bindings.ts : ne pas modifier à la main. -->`,
    '',
    '# Décisions d’architecture',
    '',
    'Chaque décision structurante est consignée dans un ADR. Un ADR accepté ou rejeté ne change plus ; ses preuves et son périmètre, qui évoluent avec le code, sont tenus dans `tools/adr/src/bindings.ts`.',
    '',
    '## Registre',
    '',
    ...table(
      ['ADR', 'Titre', 'Statut', 'Importance'],
      ordered.map((document) => [
        `[${formatAdrId(document.number)}](${fileName(document)})`,
        cell(document.title ?? 'illisible'),
        statusCell(statuses.get(document.number), byNumber),
        (document.frontMatter?.significance ?? []).map(code).join(', '),
      ]),
    ),
    '',
    '## Confirmation',
    ...confirmation(ordered, statuses, bindings),
    '',
    '## Référentiel',
    '',
    'Valeurs en vigueur de `tools/adr/src/spec.ts`.',
    '',
    '### Statuts',
    '',
    ...table(
      ['Statut', 'Transitions'],
      STATUSES.map((status) => [
        code(status),
        TRANSITIONS[status].length === 0 ? 'aucune : le fichier est figé' : TRANSITIONS[status].map(code).join(', '),
      ]),
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
    '### Sections',
    '',
    ...SECTION_ORDER.map(
      (key, index) =>
        `${String(index + 1)}. ${SECTIONS[key]}${key === 'decision' ? `, avec la sous-section ${CONSEQUENCES_TITLE}` : ''}`,
    ),
    '',
    '### Limites',
    '',
    `- ${String(LIMITS.words)} mots au plus, hors blocs de code.`,
    `- Titre de ${String(LIMITS.titleCodePoints)} caractères au plus.`,
    `- ${String(LIMITS.minOptions)} options étudiées au moins.`,
    '',
    '### Contrôles',
    '',
    ...table(
      ['Code', 'Portée', 'Vérifie'],
      CHECK_CODES.map((checkCode) => [
        code(checkCode),
        SCOPE_WORDS[CHECKS[checkCode].scope],
        cell(CHECKS[checkCode].summary),
      ]),
    ),
    '',
  ].join('\n');
  const filepath = join(root, INDEX_FILE);
  return format(markdown, { ...(await resolveConfig(filepath)), filepath });
}
