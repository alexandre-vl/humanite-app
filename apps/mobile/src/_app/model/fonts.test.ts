import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { FACE_METRICS, FACE_SETS, FONT_FAMILIES } from '@huma/design-tokens';
import { FONTS } from './fonts';

/**
 * Every family the tokens name, read off the table rather than listed again here: a face added to the tokens and not
 * to the startup registry renders as the system font, silently, and a hand-written list would not notice. A set with
 * fewer files than the paper has faces names one of them twice, so they are counted once.
 */
const families = [...new Set(Object.values(FONT_FAMILIES).flatMap((set): readonly string[] => Object.values(set)))];

/** Where the vendored files lie, from this file: out of the model and the app layer, then out of `src`. */
const VENDORED = join(__dirname, '..', '..', '..', 'node_modules', '@expo-google-fonts');

/** The file a family is read from: `Overpass_300Light_Italic` lies in `overpass/300Light_Italic`. */
const fileOf = (family: string): string => {
  const [name = '', ...weight] = family.split('_');
  const folder = name.replace(/([a-z])([A-Z])/gu, '$1-$2').toLowerCase();
  return join(VENDORED, folder, weight.join('_'), `${family}.ttf`);
};

/** The first and the last code point the tokens measure a face's letters over: Basic Latin to the end of Latin-1. */
const FIRST = 0x20;
const LAST = 0xff;

const LETTER = /^\p{L}$/u;

/**
 * What the tokens hold of a face, read off its TrueType file: the units of its em, its ascent and descent and the gap
 * it asks between lines in the `hhea` table, and the highest point any letter from `FIRST` to `LAST` reaches, read off
 * the box each glyph's header carries. Characters are found through the Windows Unicode map, the format-4 table
 * every vendored file carries.
 */
const measured = (family: string): Readonly<Record<string, number>> => {
  const file = readFileSync(fileOf(family));
  const tables = new Map<string, number>();
  for (let index = 0; index < file.readUInt16BE(4); index += 1) {
    const record = 12 + index * 16;
    tables.set(file.toString('latin1', record, record + 4), file.readUInt32BE(record + 8));
  }
  const table = (tag: string): number => {
    const offset = tables.get(tag);
    if (offset === undefined) {
      throw new Error(`${family} n’a pas de table ${tag}`);
    }
    return offset;
  };
  const header = table('head');
  const horizontal = table('hhea');
  const locations = table('loca');
  const outlines = table('glyf');
  const characters = table('cmap');
  const glyphStart = (glyph: number): number =>
    file.readInt16BE(header + 50) === 0
      ? file.readUInt16BE(locations + glyph * 2) * 2
      : file.readUInt32BE(locations + glyph * 4);
  const maps = [...Array.from({ length: file.readUInt16BE(characters + 2) }).keys()].map(
    (index) => characters + 4 + index * 8,
  );
  const windows = maps.find((record) => file.readUInt16BE(record) === 3 && file.readUInt16BE(record + 2) === 1);
  if (windows === undefined) {
    throw new Error(`${family} n’a pas de table Unicode de Windows`);
  }
  const map = characters + file.readUInt32BE(windows + 4);
  const segments = file.readUInt16BE(map + 6) / 2;
  const ends = map + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  const glyphOf = (point: number): number => {
    const segment = [...Array.from({ length: segments }).keys()].find(
      (index) => file.readUInt16BE(ends + index * 2) >= point,
    );
    if (segment === undefined || file.readUInt16BE(starts + segment * 2) > point) {
      return 0;
    }
    const delta = file.readInt16BE(deltas + segment * 2);
    const range = file.readUInt16BE(ranges + segment * 2);
    if (range === 0) {
      return (point + delta + 0x10000) % 0x10000;
    }
    const start = file.readUInt16BE(starts + segment * 2);
    const glyph = file.readUInt16BE(ranges + segment * 2 + range + (point - start) * 2);
    return glyph === 0 ? 0 : (glyph + delta + 0x10000) % 0x10000;
  };
  const tops = [...Array.from({ length: LAST - FIRST + 1 }).keys()]
    .map((index) => FIRST + index)
    .filter((point) => LETTER.test(String.fromCodePoint(point)))
    .map(glyphOf)
    .filter((glyph) => glyph !== 0 && glyphStart(glyph + 1) > glyphStart(glyph))
    .map((glyph) => file.readInt16BE(outlines + glyphStart(glyph) + 8));
  return {
    unitsPerEm: file.readUInt16BE(header + 18),
    ascent: file.readInt16BE(horizontal + 4),
    descent: -file.readInt16BE(horizontal + 6),
    lineGap: file.readInt16BE(horizontal + 8),
    peak: Math.max(...tops),
  };
};

/** Every face of every set, with the family `FONT_FAMILIES` names for it and the metrics `FACE_METRICS` holds. */
const FACES = FACE_SETS.flatMap((set) => {
  const named = new Map<string, string>(Object.entries(FONT_FAMILIES[set]));
  return Object.entries(FACE_METRICS[set]).map(
    ([face, metrics]) => [`${set}.${face}`, named.get(face), metrics] as const,
  );
});

describe('FONTS', () => {
  it('enregistre chaque famille que les tokens référencent', () => {
    expect([...Object.keys(FONTS)].sort()).toEqual([...families].sort());
  });

  /**
   * The room a title keeps over its first line is worked out from these numbers, and a file updated under them would
   * cut its letters again without a word. The line gap is read too: the room is worked out for faces that ask none.
   */
  it.each(FACES)('tient les mesures de %s telles que son fichier les dessine', (face, family, metrics) => {
    if (family === undefined) {
      throw new Error(`${face} ne nomme aucun fichier`);
    }
    const { lineGap, ...read } = measured(family);
    expect(read).toEqual(metrics);
    expect(lineGap).toBe(0);
  });
});
