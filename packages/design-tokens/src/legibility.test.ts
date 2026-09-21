import { describe, expect, test } from 'vitest';
import { contrastRatio } from './contrast.ts';
import { DEPARTURES, GROUNDS, PRINTINGS, requiredRatio, SHAPE_RATIO, SHAPES } from './legibility.ts';
import type { Theme } from './theme.ts';
import { THEMES } from './theme.ts';
import type { TextVariant } from './typography.ts';
import { TEXT_SCALES, TEXT_TONES, TEXT_VARIANTS, typographyAt } from './typography.ts';

/** Every theme the tokens publish, read from the table instead of listed again beside it. */
const themes: readonly (readonly [string, Theme])[] = Object.entries(THEMES);

/** The smallest step a reader can set the paper at, which is the one that asks the most of a colour. */
const SMALLEST = TEXT_SCALES[0];

/** A face set has no say in a size — a step multiplies the role's own — so the paper's own answers for both. */
const sizeOf = (variant: TextVariant): number => typographyAt(variant, SMALLEST, 'paper').size;

/**
 * The fact the old thresholds got wrong, stated where it can be read: a headline is the only thing this paper sets
 * large enough for WCAG's easier bar. Everything else — including a caption held at three to one until now — owes the
 * full four and a half.
 */
test('two roles are large text, and every other variant owes the full bar', () => {
  const bars = TEXT_VARIANTS.map((variant) => [variant, requiredRatio(sizeOf(variant))] as const);
  // The two set in the paper's red, and the only two: both clear twenty-four points at the smallest step a reader
  // can ask for — the headline with room to spare, the masthead by half a point, which is why it is twenty-eight.
  expect(bars.filter(([, bar]) => bar === 3).map(([variant]) => variant)).toEqual(['headline', 'masthead']);
  expect(sizeOf('masthead')).toBeGreaterThanOrEqual(24);
  // Counted off the list rather than written down: a variant added to the table joins one side or the other here,
  // and a number in this line would have to be edited to keep saying something true.
  expect(bars.filter(([, bar]) => bar === 4.5)).toHaveLength(TEXT_VARIANTS.length - 2);
});

describe.each(themes)('%s theme', (name, theme) => {
  for (const tone of TEXT_TONES) {
    const printing = PRINTINGS[tone];
    const required = requiredRatio(sizeOf(printing.smallest));
    for (const ground of printing.grounds) {
      const departure = DEPARTURES.find((entry) => entry.tone === tone && entry.ground === ground);

      test(`${name}: ${tone} on ${ground} is read at ${String(required)} to one`, () => {
        const ratio = contrastRatio(theme[tone], theme[ground]);
        if (departure === undefined) {
          expect(ratio).toBeGreaterThanOrEqual(required);
          return;
        }
        // A departure is held from both sides: it may not get worse, and it may not quietly stop being one — a
        // pairing that has climbed over the bar leaves a reason written in the tokens that is no longer true.
        expect(ratio).toBeGreaterThanOrEqual(departure.floor);
        expect(ratio).toBeLessThan(required);
      });
    }
  }
});

describe.each(themes)('%s theme, drawn', (name, theme) => {
  for (const shape of SHAPES) {
    test(`${name}: ${shape.part} on ${shape.against} shows ${shape.says}`, () => {
      expect(contrastRatio(theme[shape.part], theme[shape.against])).toBeGreaterThanOrEqual(SHAPE_RATIO);
    });
  }
});

/** A departure that named a pairing no screen prints would excuse nothing, and nothing would say so. */
test('every departure names a pairing the paper actually prints', () => {
  for (const departure of DEPARTURES) {
    expect(PRINTINGS[departure.tone].grounds, departure.tone).toContain(departure.ground);
  }
});

/**
 * And a ground nobody prints on is a ground the rule would keep asking about for nothing. The list is what says which
 * roles carry text at all — the ones left out of it, `premium` and the two text colours themselves, are left out
 * because no screen lays a word on them outside the light scope the theme test pins.
 */
test('every ground the rule names carries some colour of text', () => {
  const printed = new Set(Object.values(PRINTINGS).flatMap((printing) => printing.grounds));
  expect([...GROUNDS].filter((ground) => !printed.has(ground))).toEqual([]);
});
