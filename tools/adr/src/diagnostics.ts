import type { RepoPath } from './model.ts';

type CheckScope = 'file' | 'collection' | 'repository' | 'history';

/** Every check `adr:check` runs, with a stable code; each code is proven by at least one fixture. */
export const CHECKS = {
  'adr/path': { scope: 'file', summary: 'fichier nommé docs/adr/NNNN-slug.md, aucun autre fichier ni dossier' },
  'adr/encoding': { scope: 'file', summary: 'UTF-8 valide, sans BOM, normalisé NFC' },
  'adr/frontmatter-yaml': { scope: 'file', summary: 'en-tête YAML 1.2 présent, sans erreur ni avertissement' },
  'adr/frontmatter-schema': { scope: 'file', summary: 'en-tête conforme au schéma du format' },
  'adr/frontmatter-canonical': { scope: 'file', summary: 'en-tête écrit sous sa forme canonique unique' },
  'adr/markdown-subset': { scope: 'file', summary: 'seuls les éléments Markdown autorisés sont utilisés' },
  'adr/title': { scope: 'file', summary: 'un seul titre de niveau 1, court, sans « : » ni ponctuation finale' },
  'adr/slug': { scope: 'file', summary: 'nom de fichier dérivé du titre' },
  'adr/sections': { scope: 'file', summary: 'sections MADR traduites, toutes présentes, dans l’ordre' },
  'adr/context': { scope: 'file', summary: 'faits sourcés puis une seule question' },
  'adr/criteria': { scope: 'file', summary: 'critères C1…Cn numérotés sans trou' },
  'adr/options': { scope: 'file', summary: 'au moins deux options, reprises à l’identique en section 5' },
  'adr/decision': { scope: 'file', summary: 'option retenue parmi les options, règles R1…Rn dont une contraignante' },
  'adr/keywords': { scope: 'file', summary: 'un mot-clé DOIT, NE DOIT PAS ou PEUT par règle, aucun ailleurs' },
  'adr/valence': { scope: 'file', summary: 'puces Bien, Neutre ou Mauvais « parce que », coûts nommés' },
  'adr/criteria-cited': { scope: 'file', summary: 'chaque argument cite un critère existant, chaque critère est cité' },
  'adr/reevaluation': { scope: 'file', summary: 'un déclencheur de réévaluation' },
  'adr/words': { scope: 'file', summary: '900 mots au plus, hors blocs de code' },
  'adr/link-target': { scope: 'file', summary: 'les liens relatifs visent un fichier existant' },
  'adr/number-unique': { scope: 'collection', summary: 'un numéro par ADR' },
  'adr/references': { scope: 'collection', summary: 'remplacements et mentions visent des ADR existants et valides' },
  'adr/index': { scope: 'collection', summary: 'index docs/adr/README.md régénéré à l’identique' },
  'adr/bindings': { scope: 'repository', summary: 'chaque règle contraignante acceptée est liée à des preuves' },
  'adr/scope': { scope: 'repository', summary: 'chaque périmètre couvre au moins un fichier' },
  'adr/history': { scope: 'history', summary: 'historique git complet disponible' },
  'adr/transitions': { scope: 'history', summary: 'statuts : proposed d’abord, puis une seule décision définitive' },
  'adr/frozen': { scope: 'history', summary: 'un ADR décidé ne change plus' },
  'adr/no-deletion': { scope: 'history', summary: 'un ADR commité n’est jamais supprimé' },
  'adr/accept-proofs': { scope: 'history', summary: 'un ADR accepté dans l’index a des preuves qui passent' },
} as const satisfies Readonly<Record<string, Readonly<{ scope: CheckScope; summary: string }>>>;

export type CheckCode = keyof typeof CHECKS;

export const CHECK_CODES = Object.freeze(
  Object.keys(CHECKS).filter((key): key is CheckCode => Object.hasOwn(CHECKS, key)),
);

export type Diagnostic = Readonly<{
  code: CheckCode;
  path: RepoPath;
  /** 1-based; 1 when the diagnostic concerns the whole file. */
  line: number;
  column: number;
  message: string;
  /** Commit the diagnostic refers to, for history checks. */
  commit: string | null;
}>;

export type Position = Readonly<{ line: number; column: number }>;

export const START: Position = { line: 1, column: 1 };

export const diagnostic = (
  code: CheckCode,
  path: RepoPath,
  position: Position,
  message: string,
  commit: string | null = null,
): Diagnostic => ({ code, path, line: position.line, column: position.column, message, commit });

export const formatDiagnostic = ({ path, line, column, code, message, commit }: Diagnostic): string =>
  `${path}:${String(line)}:${String(column)}: ${code}: ${message}${commit === null ? '' : ` (commit ${commit.slice(0, 7)})`}`;

export function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }
  if (left.line !== right.line) {
    return left.line - right.line;
  }
  if (left.column !== right.column) {
    return left.column - right.column;
  }
  return left.code === right.code ? 0 : left.code < right.code ? -1 : 1;
}
