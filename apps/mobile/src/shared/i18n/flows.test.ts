import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { FR } from './fr';

/**
 * Where the Maestro flows live, from this file: three levels out of the shared layer, then out of `src`.
 *
 * The flows are the one place the app's words are written twice. Maestro sees no types and no dictionary — it reaches
 * an element by the letters on it — so a flow names a screen the way a reader would, and a key renamed on one side
 * leaves the other saying something nothing says any more. Nothing reported that: no generator reads these files, and
 * `À la une` had already become ambiguous, meaning both a tab and a band, without a single check noticing.
 *
 * So the rule is on the quoting: a single-quoted string in a flow is a word a reader sees and must be in the
 * dictionary; everything else a flow names — a screenshot, a variable, a word someone types into a search field — is
 * written bare. A reader's question is not the app's text and has no business in the dictionary.
 */
const FLOWS = join(__dirname, '..', '..', '..', 'e2e');

const SINGLE_QUOTED = /'([^']*)'/gu;

/** Every `.yaml` of the flows, the shared parts included, as pairs of path and text. */
const flowFiles = (): readonly (readonly [string, string])[] => {
  const walk = (directory: string): readonly string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(path);
      }
      return entry.name.endsWith('.yaml') ? [path] : [];
    });
  return walk(FLOWS).map((path) => [path, readFileSync(path, 'utf8')] as const);
};

/**
 * The words a flow quotes, which are the words it expects a reader to see. Comment lines are left out: they are
 * prose about the flow, not selectors, and an apostrophe in a sentence is not the opening of a quotation.
 */
const quotedIn = (text: string): readonly string[] =>
  text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .flatMap((line) => [...line.matchAll(SINGLE_QUOTED)])
    .flatMap((found) => (found[1] === undefined ? [] : [found[1]]));

const SPOKEN = new Set<string>(Object.values(FR));

describe('les parcours Maestro', () => {
  it('en nomment au moins un, et celui qui garde le retour système', () => {
    const names = flowFiles().map(([path]) => path);
    expect(names.length).toBeGreaterThan(1);
    expect(names.some((path) => path.endsWith('system-back.yaml'))).toBe(true);
  });

  it('ne citent que des mots du dictionnaire', () => {
    for (const [path, text] of flowFiles()) {
      for (const word of quotedIn(text)) {
        expect(SPOKEN.has(word) ? word : `${word} (${path})`).toBe(word);
      }
    }
  });

  /**
   * A flow that quoted nothing would pass the rule above by saying nothing at all. The count is what makes the rule
   * bite: the words are really there, and really read.
   */
  it('en citent assez pour que la règle ait quelque chose à tenir', () => {
    const quoted = flowFiles().flatMap(([, text]) => quotedIn(text));
    expect(quoted.length).toBeGreaterThanOrEqual(20);
  });
});
