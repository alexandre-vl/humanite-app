import { expect, test } from 'vitest';
import { color } from './brand.ts';
import { contrastRatio } from './contrast.ts';
import { judgeLegibility, requiredRatio, THE_PAPER } from './legibility.ts';
import { PALETTE } from './palette.ts';
import { THEME_NAMES, THEMES } from './theme.ts';
import type { TextVariant } from './typography.ts';
import { TEXT_SCALES, TEXT_VARIANTS, typographyAt } from './typography.ts';

/** The smallest step a reader can set the paper at, which is the one that asks the most of a colour. */
const SMALLEST = TEXT_SCALES[0];

/** A face set has no say in a size — a step multiplies the role's own — so the paper's own answers for both. */
const sizeOf = (variant: TextVariant): number => typographyAt(variant, SMALLEST, 'paper').size;

/**
 * The fact the old thresholds got wrong, stated where it can be read: the two roles set in the paper's red are the
 * only things it sets large enough for WCAG's easier bar. Everything else — including a caption held at three to one
 * until now — owes the full four and a half.
 */
test('two roles are large text, and every other variant owes the full bar', () => {
  const bars = TEXT_VARIANTS.map((variant) => [variant, requiredRatio(sizeOf(variant))] as const);
  // Both clear twenty-four points at the smallest step a reader can ask for, and both clear it by the same half
  // point: they are the one size, and twenty-eight is the first step of the scale that survives being taken down an
  // eighth.
  expect(bars.filter(([, bar]) => bar === 3).map(([variant]) => variant)).toEqual(['headline', 'masthead']);
  expect(sizeOf('masthead')).toBeGreaterThanOrEqual(24);
  // Counted off the list rather than written down: a variant added to the table joins one side or the other here,
  // and a number in this line would have to be edited to keep saying something true.
  expect(bars.filter(([, bar]) => bar === 4.5)).toHaveLength(TEXT_VARIANTS.length - 2);
});

/**
 * Every pairing the paper prints, every departure it declares, every part of its one drawn control and every ground
 * its rule names, in one reading.
 *
 * It was thirty-odd tests generated from the same three tables, and what it is now is the same walk moved into a
 * function anybody can run — which is what lets a fixture hand that function a broken table and read the code that
 * comes back. A test that walks the tables itself proves the paper; it cannot prove that the walk would notice.
 * What a failure says is in the findings: each carries the theme, the pairing and the two ratios.
 */
test('the paper’s own colours are read at what their size owes', () => {
  expect(judgeLegibility(THE_PAPER)).toEqual([]);
});

/**
 * What iOS drew for the track of a switch set off, which is not the grey it was handed: it lays a veil of its own over
 * the track, darker under a light appearance and lighter under a dark one, and the app has iOS draw in the reader's
 * theme. Handed `dateGrey`, it drew these on the iPhone simulator on 25/09/2026.
 */
const IOS_TRACK_SET_OFF = {
  handed: PALETTE.dateGrey,
  drawn: { light: color('#635a6a'), dark: color('#978e9f') },
} as const;

/**
 * The reading above knows only the colours handed to the platform. Against the lighter track iOS drew, the white knob
 * measured 3.14 to 1 where the grey handed in says 5.30, so a reading of the handed grey would pass a lighter one that
 * iOS then takes under the three to one a control owes. The grey is therefore held to the one measured: another is a
 * track nobody has looked at, and this fails until somebody has, and has written down here what iOS drew.
 */
test('the switch set off is read as iOS draws it, on the grey it was measured drawing', () => {
  for (const name of THEME_NAMES) {
    const theme = THEMES[name];
    const drawn = IOS_TRACK_SET_OFF.drawn[name];
    expect(theme.control).toBe(IOS_TRACK_SET_OFF.handed);
    expect(contrastRatio(theme.onPrimary, drawn)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(drawn, theme.background)).toBeGreaterThanOrEqual(3);
  }
});
