import { readdirSync } from 'node:fs';
import { SECTION_COLORS } from '@huma/design-tokens';
import { expect, test } from 'vitest';
import { ASSETS, ASSET_WIDTHS } from './assets.ts';
import { VISUAL_WIDTHS, artworkSvg, judgeArtwork } from './artwork.ts';
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

/**
 * The registry that puts the pictures in the bundle is checked by name and by width, never by value: only the bundler
 * turns one of its imports into a module identifier, so what these imports hold outside the app means nothing.
 */
test('the registry offers every picture the corpus names, at every width it is written at', () => {
  expect(Object.keys(ASSETS).toSorted()).toEqual([...keys].toSorted());
  expect([...ASSET_WIDTHS]).toEqual([...VISUAL_WIDTHS]);
  for (const widths of Object.values(ASSETS)) {
    expect(
      Object.keys(widths)
        .map(Number)
        .toSorted((left, right) => left - right),
    ).toEqual([...VISUAL_WIDTHS]);
  }
});

test('the same key draws the same picture, and two keys draw two', () => {
  expect(artworkSvg('pol-a1-hero', 'pol')).toBe(artworkSvg('pol-a1-hero', 'pol'));
  expect(artworkSvg('pol-a1-hero', 'pol')).not.toBe(artworkSvg('pol-a3-hero', 'pol'));
  expect(artworkSvg('pol-a1-hero', 'pol')).not.toBe(artworkSvg('pol-a1-hero', 'mon'));
});

/**
 * The generator follows from the key of the item it illustrates and from the colour of its section, and from nothing
 * else — the same reading a fixture hands broken drawings to, run here on the real one.
 */
test('the generator draws from its key and its section, and from nothing else', () => {
  expect(judgeArtwork(artworkSvg)).toEqual([]);
});
