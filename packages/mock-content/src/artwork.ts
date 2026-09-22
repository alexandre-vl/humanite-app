import { sectionColor } from '@huma/design-tokens';
import type { SectionCode } from '@huma/design-tokens';

/**
 * The widths a visual is written at, one per place a picture fills on screen: a thumbnail beside a line of text, a
 * card, and the lead picture of an article on a dense screen.
 *
 * There is no width here that no screen asks for. One was written for a while — 640, between the thumbnail and the
 * card — and nothing could request it: the app names a place, never a count of pixels, and no place stood at that
 * width. It weighed 63 files and 78 ko of the bundle a cold start is measured against, and the check that would have
 * seen it did not exist, because the two lists were only ever held against the files and never against each other.
 */
export const VISUAL_WIDTHS = [320, 1080, 1600] as const;

/** The shape every visual is drawn in, wide enough that a card may crop it to any of the boxes the app lays out. */
const WIDTH = 1600;
const HEIGHT = 900;

/** FNV-1a over the key: the same picture is drawn for the same name, on any machine, in any order. */
const seedOf = (key: string): number => {
  let hash = 0x81_1c_9d_c5;
  for (const character of key) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01_00_01_93) >>> 0;
  }
  return hash;
};

/** `count` values in [0, 1) drawn from the seed, by the mulberry32 generator. */
const randoms = (seed: number, count: number): readonly number[] => {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_00_00_00_00;
  });
};

const channelAt = (hex: string, index: number): number => Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);

/** The ground moved `amount` of the way towards black (0) or white (255), for a tint that stays in the same family. */
const shade = (hex: string, towards: number, amount: number): string => {
  const channels = [0, 1, 2].map((index) => {
    const value = channelAt(hex, index);
    return Math.round(value + (towards - value) * amount);
  });
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * The picture that stands in for a photograph the mock does not have: the section's ground, a disc and a ridge in two
 * tints of it, and a rule. Everything but the ground comes from the key, so two items of one section differ and a
 * rebuild never moves a pixel.
 */
export const artworkSvg = (key: string, code: SectionCode): string => {
  const ground = sectionColor(code);
  const values = randoms(seedOf(key), 6);
  const at = (index: number): number => values[index] ?? 0;
  const light = shade(ground, 255, 0.28);
  const dark = shade(ground, 0, 0.42);
  const cx = Math.round(WIDTH * (0.25 + at(0) * 0.6));
  const cy = Math.round(HEIGHT * (0.1 + at(1) * 0.5));
  const radius = Math.round(HEIGHT * (0.22 + at(2) * 0.22));
  const left = Math.round(HEIGHT * (0.5 + at(3) * 0.3));
  const middle = Math.round(HEIGHT * (0.34 + at(4) * 0.3));
  const rule = Math.round(WIDTH * (0.08 + at(5) * 0.78));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(WIDTH)}" height="${String(HEIGHT)}" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}">`,
    `<rect width="${String(WIDTH)}" height="${String(HEIGHT)}" fill="${ground}"/>`,
    `<circle cx="${String(cx)}" cy="${String(cy)}" r="${String(radius)}" fill="${light}" opacity="0.45"/>`,
    `<path d="M0 ${String(left)} L${String(Math.round(WIDTH * 0.42))} ${String(middle)} L${String(WIDTH)} ${String(Math.round(left * 0.8))} L${String(WIDTH)} ${String(HEIGHT)} L0 ${String(HEIGHT)} Z" fill="${dark}" opacity="0.55"/>`,
    `<rect x="${String(rule)}" y="0" width="12" height="${String(HEIGHT)}" fill="${light}" opacity="0.3"/>`,
    '</svg>',
  ].join('');
};

/**
 * The name of one thing a reading of the drawing can find wrong: one code per thing that can stop being true of it, so
 * the rule is proven by a fixture that makes exactly its code appear rather than by a test nobody can point at. A union
 * rather than a list, nothing ever walking the codes: a reading names exactly one, and a fixture names the set it
 * expects.
 */
export type ArtworkCode = 'artwork/not-deterministic' | 'artwork/key-ignored' | 'artwork/section-ignored';

/** One thing a reading found wrong, and what it drew to find it out. */
export type ArtworkFinding = Readonly<{ code: ArtworkCode; says: string }>;

/** A way of drawing a visual, which is what the reading below is handed rather than reaching for one. */
export type Draw = (key: string, code: SectionCode) => string;

/** Two keys of two items, and two sections, which is the least it takes to see whether either is read. */
const ONE_KEY = 'pol-a1-hero';
const OTHER_KEY = 'pol-a2-hero';
const ONE_SECTION: SectionCode = 'pol';
const OTHER_SECTION: SectionCode = 'env';

/**
 * Whether a drawing follows from its key and its section's colour, and from nothing else.
 *
 * The drawing is handed in rather than read from this module, and that is what makes the rule provable: a reading
 * that reached for `artworkSvg` could only ever answer about `artworkSvg`, so nothing could show that it answers at
 * all. Given the drawing, a fixture hands it one that ignores its key, or its section, or that moves between two
 * calls, and reads the code that comes back — and the generator's own is what the package's test hands it.
 *
 * Determinism is what a rebuild rests on: the same name draws the same picture on any machine and in any order, so
 * regenerating the corpus moves no pixel and adds no file to a commit.
 */
export const judgeArtwork = (draw: Draw): readonly ArtworkFinding[] => {
  const drawn = draw(ONE_KEY, ONE_SECTION);
  return [
    ...(drawn === draw(ONE_KEY, ONE_SECTION)
      ? []
      : [
          {
            code: 'artwork/not-deterministic' as const,
            says: `deux appels sur « ${ONE_KEY} » ne rendent pas le même dessin`,
          },
        ]),
    ...(drawn === draw(OTHER_KEY, ONE_SECTION)
      ? [{ code: 'artwork/key-ignored' as const, says: `« ${ONE_KEY} » et « ${OTHER_KEY} » rendent le même dessin` }]
      : []),
    ...(drawn === draw(ONE_KEY, OTHER_SECTION)
      ? [
          {
            code: 'artwork/section-ignored' as const,
            says: `« ${ONE_SECTION} » et « ${OTHER_SECTION} » rendent le même dessin`,
          },
        ]
      : []),
  ];
};
