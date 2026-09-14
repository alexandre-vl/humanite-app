import type { Diagnostic, Position } from '@huma/kit/diagnostics';
import { START } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import type { BindingsSource } from '../model/bindings.ts';
import { isConvention } from '../model/bindings.ts';
import type { AdrDocument } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId, parseAdrId } from '../model/identifiers.ts';
import type { ScopedCode } from '../spec/checks.ts';
import { finding } from '../spec/checks.ts';
import type { EffectiveStatus } from '../spec/statuses.ts';
import { STATUS_LABELS } from '../spec/statuses.ts';
import { compileGlob } from './globs.ts';
import { grammarOf } from '../analysis/grammar.ts';

type RepositoryCode = ScopedCode<'repository'>;

/** Line of the first `'key'` literal in the bindings file, to point a finding at the right entry. */
function lineOf(text: string | null, key: string): Position {
  const offset = text?.indexOf(`'${key}'`) ?? -1;
  if (text === null || offset === -1) {
    return START;
  }
  return { line: text.slice(0, offset).split('\n').length, column: 1 };
}

/**
 * Bindings follow the ADRs: each binding rule of an ADR in force is proven or justified by a convention, an accepted
 * ADR has at least one proven rule, and an ADR no longer in force has no bindings left.
 */
export function checkBindings(
  documents: readonly AdrDocument[],
  statuses: ReadonlyMap<AdrNumber, EffectiveStatus>,
  source: BindingsSource,
): readonly Diagnostic<RepositoryCode>[] {
  const diagnostics: Diagnostic<RepositoryCode>[] = [];
  const at = (key: string): Position => lineOf(source.text, key);
  const byNumber = new Map(documents.map((document) => [document.number, document]));
  for (const [key, binding] of Object.entries(source.bindings)) {
    const number = parseAdrId(key);
    if (number === null) {
      diagnostics.push(finding('adr/binding-malformed-id', source.path, { key }, at(key)));
      continue;
    }
    const id = formatAdrId(number);
    const document = byNumber.get(number);
    if (document === undefined) {
      diagnostics.push(finding('adr/binding-unknown-adr', source.path, { id }, at(key)));
      continue;
    }
    const status = statuses.get(number);
    if (document.kind !== 'readable' || document.rules === null || status === undefined) {
      continue;
    }
    if (status.kind === 'rejected' || status.kind === 'superseded') {
      diagnostics.push(
        finding('adr/binding-inactive', source.path, { id, status: STATUS_LABELS[status.kind] }, at(key)),
      );
      continue;
    }
    const bindingLevels = grammarOf(document.spec).bindingLevels;
    const ruleIds = new Set<string>(document.rules.map((rule) => rule.id));
    const expected = new Set<string>(
      document.rules.filter((rule) => bindingLevels.includes(rule.level)).map((rule) => rule.id),
    );
    const actual = Object.keys(binding.rules);
    for (const rule of [...expected].filter((ruleId) => !actual.includes(ruleId))) {
      diagnostics.push(finding('adr/binding-rule-unbound', source.path, { id, rule }, at(key)));
    }
    let proven = false;
    for (const [rule, ruleBinding] of Object.entries(binding.rules)) {
      if (!ruleIds.has(rule)) {
        diagnostics.push(finding('adr/binding-rule-extra', source.path, { id, rule }, at(key)));
        continue;
      }
      if (isConvention(ruleBinding)) {
        if (ruleBinding.convention.trim() === '') {
          diagnostics.push(finding('adr/binding-convention-empty', source.path, { id, rule }, at(key)));
        }
        continue;
      }
      proven ||= expected.has(rule);
      for (const proof of ruleBinding.filter((proofId) => !source.proofs.has(proofId))) {
        diagnostics.push(
          finding('adr/binding-proof-unknown', source.path, { id, rule, proof }, lineOf(source.text, proof)),
        );
      }
    }
    if (status.kind === 'accepted' && !proven) {
      diagnostics.push(finding('adr/binding-no-proven-rule', source.path, { id }, at(key)));
    }
  }
  for (const document of documents) {
    const id = formatAdrId(document.number);
    if (statuses.get(document.number)?.kind === 'accepted' && !Object.hasOwn(source.bindings, id)) {
      diagnostics.push(finding('adr/binding-missing', source.path, { id }));
    }
  }
  return diagnostics;
}

/** Each scope glob is valid, unique within its ADR, and matches at least one file of the repository. */
export function checkScopes(
  source: BindingsSource,
  files: ReadonlySet<RepoPath>,
): readonly Diagnostic<RepositoryCode>[] {
  const diagnostics: Diagnostic<RepositoryCode>[] = [];
  for (const [id, binding] of Object.entries(source.bindings)) {
    const seen = new Set<string>();
    for (const glob of binding.scope.paths) {
      const pattern = compileGlob(glob);
      if (pattern === null) {
        diagnostics.push(finding('adr/scope-glob-invalid', source.path, { id, glob }, lineOf(source.text, glob)));
      } else if (seen.has(glob)) {
        diagnostics.push(finding('adr/scope-glob-duplicate', source.path, { id, glob }, lineOf(source.text, glob)));
      } else if (![...files].some((file) => pattern.test(file))) {
        diagnostics.push(finding('adr/scope-glob-empty', source.path, { id, glob }, lineOf(source.text, glob)));
      }
      seen.add(glob);
    }
  }
  return diagnostics;
}
