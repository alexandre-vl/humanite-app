import { posix } from 'node:path';
import type { EffectiveStatus } from './collection.ts';
import type { Diagnostic, Position } from './diagnostics.ts';
import { diagnostic, START } from './diagnostics.ts';
import type { AdrDocument } from './document.ts';
import type { AdrNumber, Bindings, RepoPath } from './model.ts';
import { formatAdrId, isConvention } from './model.ts';
import { BINDING_LEVELS } from './spec.ts';

/** The bindings in force, where they are written, and the proof ids that exist. */
export type BindingsSource = Readonly<{
  bindings: Bindings;
  path: RepoPath;
  /** Source text of the bindings file, to point diagnostics at the right line; `null` when unknown. */
  text: string | null;
  knownProofs: ReadonlySet<string>;
}>;

function lineOf(text: string | null, id: string): Position {
  const offset = text?.indexOf(`'${id}'`) ?? -1;
  if (text === null || offset === -1) {
    return START;
  }
  return { line: text.slice(0, offset).split('\n').length, column: 1 };
}

const STATUS_WORDS: Readonly<Record<EffectiveStatus['kind'], string>> = {
  proposed: 'proposé',
  accepted: 'accepté',
  rejected: 'rejeté',
  superseded: 'remplacé',
};

export function checkBindings(
  documents: readonly AdrDocument[],
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>,
  source: BindingsSource,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const report = (id: string, message: string): void => {
    diagnostics.push(diagnostic('adr/bindings', source.path, lineOf(source.text, id), `${id} : ${message}`));
  };
  const byId = new Map<string, AdrDocument>(documents.map((document) => [formatAdrId(document.number), document]));
  for (const [id, binding] of Object.entries(source.bindings)) {
    const document = byId.get(id);
    if (binding === undefined) {
      continue;
    }
    if (document === undefined) {
      report(id, 'cet ADR n’existe pas, retirer ses liens');
      continue;
    }
    const status = statuses.get(document.number);
    if (status === undefined || document.rules === null || document.rules.some((rule) => rule.level === null)) {
      continue;
    }
    if (status.kind === 'rejected' || status.kind === 'superseded') {
      report(id, `ADR ${STATUS_WORDS[status.kind]} : ses règles ne s’appliquent plus, retirer ses liens`);
      continue;
    }
    const expected = document.rules
      .filter((rule) => BINDING_LEVELS.some((level) => level === rule.level))
      .map((rule) => rule.id);
    const actual = Object.keys(binding.rules);
    for (const rule of expected.filter((ruleId) => !actual.includes(ruleId))) {
      report(id, `${rule} est contraignante mais n’a ni preuve ni convention`);
    }
    for (const rule of actual.filter((ruleId) => !expected.some((expectedId) => expectedId === ruleId))) {
      report(id, `${rule} n’est pas une règle DOIT ou NE DOIT PAS de l’ADR`);
    }
    let proven = false;
    for (const [rule, ruleBinding] of Object.entries(binding.rules)) {
      if (ruleBinding === undefined) {
        continue;
      }
      if (isConvention(ruleBinding)) {
        if (ruleBinding.convention.trim() === '') {
          report(id, `${rule} : convention sans justification`);
        }
        continue;
      }
      proven = true;
      for (const proof of ruleBinding.filter((proofId) => !source.knownProofs.has(proofId))) {
        report(id, `${rule} : preuve inconnue ${proof}`);
      }
    }
    if (status.kind === 'accepted' && !proven) {
      report(id, 'un ADR accepté a au moins une règle prouvée par une fixture');
    }
  }
  for (const document of documents) {
    const id = formatAdrId(document.number);
    if (statuses.get(document.number)?.kind === 'accepted' && source.bindings[id] === undefined) {
      report(id, 'ADR accepté sans liens vers ses preuves');
    }
  }
  return diagnostics;
}

const isValidGlob = (glob: string): boolean =>
  !/[\s\\]/u.test(glob) && glob.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');

export function checkScopes(source: BindingsSource, files: ReadonlySet<string>): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sortedFiles = [...files];
  for (const [id, binding] of Object.entries(source.bindings)) {
    if (binding === undefined) {
      continue;
    }
    const report = (message: string): void => {
      diagnostics.push(diagnostic('adr/scope', source.path, lineOf(source.text, id), `${id} : ${message}`));
    };
    const seen = new Set<string>();
    for (const glob of binding.scope) {
      if (!isValidGlob(glob)) {
        report(`motif invalide « ${glob} » : relatif à la racine, sans ./, .., / final ni espace`);
      } else if (seen.has(glob)) {
        report(`motif en double « ${glob} »`);
      } else if (!sortedFiles.some((file) => posix.matchesGlob(file, glob))) {
        report(`« ${glob} » ne couvre aucun fichier du dépôt`);
      }
      seen.add(glob);
    }
  }
  return diagnostics;
}
