import { expect, test } from 'vitest';
import { judgeLegibility, requiredRatio, THE_PAPER } from './legibility.ts';
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
