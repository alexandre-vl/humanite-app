import { expect, test } from 'vitest';
import { readCanonicalHeader } from '../model/header.ts';
import { PROPOSED, replaceOnce, ZERO } from '../proofs/documents.ts';
import { checkFiles } from '../proofs/runners.ts';

/**
 * Spellings YAML accepts and the canonical reader refuses. `adr:check` must refuse them too: the agent hook and
 * `adr:decide` read the canonical text alone, and would otherwise refuse an ADR the checks call conforming.
 */
const SPELLINGS: Readonly<Record<string, string>> = {
  'espace après le délimiteur d’ouverture': replaceOnce(PROPOSED, '---\nformat', '--- \nformat'),
  'tabulation avant le délimiteur de fermeture': replaceOnce(PROPOSED, '\n---\n\n# ', '\n--- \n\n# '),
  'statut entre apostrophes': replaceOnce(PROPOSED, 'status: proposed', "status: 'proposed'"),
  'commentaire dans l’en-tête': replaceOnce(PROPOSED, 'status: proposed', 'status: proposed # bientôt'),
  'critère répété': replaceOnce(PROPOSED, '[dependency]', '[dependency, dependency]'),
  'deux espaces après la clé': replaceOnce(PROPOSED, 'status: proposed', 'status:  proposed'),
};

test('each header spelling the canonical reader refuses is reported by the file checks', () => {
  for (const [spelling, document] of Object.entries(SPELLINGS)) {
    expect(readCanonicalHeader(document), spelling).toBeNull();
    expect(checkFiles({ [ZERO]: document }), spelling).toContain('adr/frontmatter-not-canonical');
  }
});

test('the header of an ADR the file checks accept is the one the canonical reader reads', () => {
  expect(checkFiles({ [ZERO]: PROPOSED })).toEqual([]);
  expect(readCanonicalHeader(PROPOSED)?.header).toEqual({
    format: 1,
    status: 'proposed',
    significance: ['dependency'],
    supersedes: [],
  });
});
