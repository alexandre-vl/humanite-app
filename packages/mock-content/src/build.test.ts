import { expect, test } from 'vitest';
import { buildCorpus } from './build.ts';
import { CORPUS } from './index.ts';

const plainData = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

test('the generated corpus is a fresh build of the source files', () => {
  expect(plainData(CORPUS)).toEqual(plainData(buildCorpus()));
});

test('the corpus holds the seventy-two items of the eight sections', () => {
  expect(buildCorpus()).toHaveLength(72);
});
