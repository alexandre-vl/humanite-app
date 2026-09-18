import type { Color } from './brand.ts';
import { color } from './brand.ts';

/**
 * A ground colour per section, held against the three-letter code the section registry gives it. The current app names
 * a section by a red rule under its label rather than by a colour; these grounds exist for the generated visuals that
 * stand in for photographs the mock has none of, and each is dark enough to carry a white headline. Codes are strings,
 * not keys: the spelling check reads identifiers, and none of these eight is an English word.
 */
export const SECTION_COLORS = [
  ['pol', color('#7b1e3a')],
  ['eco', color('#96541a')],
  ['soc', color('#1d5a4a')],
  ['mon', color('#17416b')],
  ['cul', color('#5a2a6b')],
  ['fem', color('#a8246c')],
  ['env', color('#27511a')],
  ['spo', color('#116974')],
] as const satisfies readonly (readonly [string, Color])[];

/** The three-letter code of a section that has a ground colour. */
export type SectionCode = (typeof SECTION_COLORS)[number][0];

const entryOf = (value: string): (typeof SECTION_COLORS)[number] => {
  const found = SECTION_COLORS.find(([code]) => code === value);
  if (found === undefined) {
    throw new RangeError(`section sans couleur : ${value}`);
  }
  return found;
};

/** A code read from the section registry, as a section this module draws for; an unknown one is refused. */
export const sectionCode = (value: string): SectionCode => entryOf(value)[0];

/** The ground a section's visuals are drawn on. */
export const sectionColor = (code: SectionCode): Color => entryOf(code)[1];
