import { expect, test } from 'vitest';
import { buildCorpus, parseItem } from './build.ts';
import { CORPUS } from './index.ts';

const plainData = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

test('the generated corpus is a fresh build of the source files', () => {
  expect(plainData(CORPUS)).toEqual(plainData(buildCorpus()));
});

test('the corpus holds the seventy-two items of the eight sections', () => {
  expect(buildCorpus()).toHaveLength(72);
});

const ITEM = (body: string): string => `---\nid: pol-a1\n---\n\n${body}\n`;

test('a directive the corpus does not write is refused, and named', () => {
  expect(() => parseItem(ITEM('::video[Une nuit au conseil]'))).toThrow(/directive inconnue : ::video/u);
});
