import { describe, expect, it } from '@jest/globals';
import { CONTENT_SOURCE, sourceOf } from './source';

describe('sourceOf', () => {
  it('lit le corpus quand le build n’a choisi aucune source', () => {
    expect(sourceOf(undefined)).toBe('mock');
  });

  it('lit la source que le build a nommée', () => {
    expect(sourceOf('service')).toBe('service');
    expect(sourceOf('mock')).toBe('mock');
  });

  /** A misspelt source is refused at the first line rather than read as the corpus the builder did not mean. */
  it('refuse un mot qui ne nomme aucune source, en le citant', () => {
    expect(() => sourceOf('servce')).toThrow(/servce/u);
  });
});

/** The tests read the corpus by construction: the setup names it, whatever the shell running them says. */
it('fait lire le corpus aux tests', () => {
  expect(CONTENT_SOURCE).toBe('mock');
});
