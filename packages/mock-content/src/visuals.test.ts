import { readdirSync } from 'node:fs';
import { SECTION_COLORS } from '@huma/design-tokens';
import { expect, test } from 'vitest';
import { VISUAL_WIDTHS, artworkSvg } from './artwork.ts';
import { VISUALS } from './generated/visuals.ts';
import { CORPUS } from './index.ts';
import { IMAGES, imageName } from './render.ts';
import { SECTIONS } from './registries.ts';
import { imageKeys } from './validate.ts';

const keys = CORPUS.flatMap((article) => imageKeys(article));

test('every section of the registry has a ground, and every ground a section', () => {
  expect(SECTIONS.map((section) => section.code).toSorted()).toEqual(SECTION_COLORS.map(([code]) => code).toSorted());
});

test('every picture the corpus names has its placeholder', () => {
  expect(Object.keys(VISUALS).toSorted()).toEqual([...keys].toSorted());
});

test('every picture is written at each width, and nothing else is', () => {
  const written = readdirSync(IMAGES).toSorted();
  const expected = keys.flatMap((key) => VISUAL_WIDTHS.map((width) => imageName(key, width))).toSorted();
  expect(written).toEqual(expected);
});

test('the same key draws the same picture, and two keys draw two', () => {
  expect(artworkSvg('pol-a1-hero', 'pol')).toBe(artworkSvg('pol-a1-hero', 'pol'));
  expect(artworkSvg('pol-a1-hero', 'pol')).not.toBe(artworkSvg('pol-a3-hero', 'pol'));
  expect(artworkSvg('pol-a1-hero', 'pol')).not.toBe(artworkSvg('pol-a1-hero', 'mon'));
});
