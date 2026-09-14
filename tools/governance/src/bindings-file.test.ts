import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { BINDINGS_PATH } from './bindings.ts';
import { withoutBindingEntries } from './bindings-file.ts';

const SAMPLE = `export const BINDINGS = {
  // Décision sur les ADR.
  'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: ['a'] } },
  'ADR-0001': {
    scope: { paths: ['tools/**'] },
    rules: { R1: ['b'] },
  },
  'ADR-0002': { scope: { paths: ['apps/**'] }, rules: { R1: { convention: 'relecture' } } },
} as const satisfies Bindings<ProofId>;
`;

test('withoutBindingEntries cuts whole entries, their comment and comma included', () => {
  expect(withoutBindingEntries(SAMPLE, ['ADR-0000', 'ADR-0002'])).toBe(`export const BINDINGS = {
  'ADR-0001': {
    scope: { paths: ['tools/**'] },
    rules: { R1: ['b'] },
  },
} as const satisfies Bindings<ProofId>;
`);
});

test('withoutBindingEntries refuses an id without entry and a file without BINDINGS', () => {
  expect(() => withoutBindingEntries(SAMPLE, ['ADR-0009'])).toThrow('aucune entrée pour ADR-0009');
  expect(() => withoutBindingEntries('export const OTHER = {};\n', ['ADR-0000'])).toThrow('objet BINDINGS introuvable');
});

test('withoutBindingEntries reads the real bindings file of the workspace', async () => {
  const text = await readFile(fileURLToPath(new URL(`../../../${BINDINGS_PATH}`, import.meta.url)), 'utf8');
  expect(withoutBindingEntries(text, ['ADR-0000'])).not.toContain("'ADR-0000'");
});
