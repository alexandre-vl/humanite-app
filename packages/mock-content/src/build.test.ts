import { blocksOf } from '@huma/contracts';
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

test('a colon glued to a word inside a label is refused, not swallowed with the rest of the line', () => {
  expect(() => parseItem(ITEM('::video[Une nuit au conseil | 4:18]'))).toThrow(/lu comme une directive/u);
});

test('a video without a running time is refused', () => {
  expect(() => parseItem(ITEM('::video[Une nuit au conseil]'))).toThrow(/durée invalide/u);
});

test('a running time written m:ss reaches the corpus in seconds', () => {
  const videos = buildCorpus().flatMap((article) => blocksOf(article).filter((block) => block.type === 'video'));
  expect(videos.map((video) => video.durationSeconds).toSorted((left, right) => left - right)).toEqual([
    245, 247, 258, 278,
  ]);
});
