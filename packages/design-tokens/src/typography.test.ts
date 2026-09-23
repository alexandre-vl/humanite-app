import { expect, expectTypeOf, test } from 'vitest';
import type { TextVariant, Typography } from './typography.ts';
import { TEXT_SCALES, TEXT_VARIANTS, typographyAt } from './typography.ts';

/** A role as the paper sets it, at the step nobody has moved: the table as it stood before a reader could touch it. */
const paper = (variant: TextVariant): Typography => typographyAt(variant, 'normal', 'paper');

// What stood here — a second list of the tones, and a loop asking the light theme whether it had each of them — is
// gone: `TEXT_TONES` is now the one list, and its own `satisfies readonly (keyof Theme)[]` refuses a tone that names
// no role. A test that re-listed what the type already holds could only ever agree with itself.

test('the typography table answers for every variant, and for no other', () => {
  expectTypeOf<TextVariant>().toEqualTypeOf<
    | 'headline'
    | 'masthead'
    | 'lead'
    | 'display'
    | 'title'
    | 'standfirst'
    | 'summary'
    | 'prose'
    | 'body'
    | 'label'
    | 'legend'
    | 'caption'
    | 'kicker'
  >();
  for (const variant of TEXT_VARIANTS) {
    expect(paper(variant).size).toBeGreaterThan(0);
  }
});

test('a line height derives from a size times its multiple', () => {
  expect(paper('body').size * paper('body').leading).toBeCloseTo(25.6); // 16 × 1.6
  expect(paper('title').size * paper('title').leading).toBeCloseTo(20.7); // 18 × 1.15
});

/**
 * The step a picture's legend takes, read off the article captures at 2.625 px per point: measured 42.0 px = 16.0
 * points against the table's 12 × 1.4 = 16.8, the closest the scale comes to any of them.
 *
 * The headline was held here too, at the 47.6 the captures gave it, and it is no longer: the current app's headline is
 * not the measurement this one wants. Three papers set a mobile headline at twenty-eight — none of them in a condensed
 * face — and this one is set in Anton, whose x-height is 0.732 em against Overpass's 0.511. What the old step held was
 * a headline standing as tall as forty-nine points of the text it opens. What holds it now is the note beside `xxxl`,
 * and the rule that derives a contrast bar from a size: at twenty-eight it may be printed in the paper's red, and at
 * the step under it may not.
 */
test('a picture’s legend steps as the article captures measure it', () => {
  expect(paper('legend').size * paper('legend').leading).toBeCloseTo(16.8, 1); // mesuré 42,0 px = 16,0
});

/**
 * A headline is set over four lines and a masthead over one, so they are two roles; they are the one size because the
 * size is what lets either be printed in the paper's red at all. What this refuses is the drift that would follow from
 * that coincidence — a headline given the masthead's job of never wrapping, and set tighter or looser than the papers
 * that set one at this size do.
 */
test('a headline is set at the size a phone sets a headline, and led as one', () => {
  expect(paper('headline').size).toBe(28);
  expect(paper('headline').size).toBe(paper('masthead').size);
  expect(paper('headline').leading).toBeLessThanOrEqual(1.25); // Guardian 1,15 · BBC 34/28 = 1,21
});

/**
 * A page ranks its cards by their titles as well as by their pictures. Every card set its title at twenty, and the
 * story a front opens on stood no taller than a card far down a section; a card the page raises now sets its title a
 * fourth above a card in a line, in the same face, so what separates the two is size and nothing a reader must decode.
 */
test('a card the page raises titles itself a fourth above a card in a line, in the same face', () => {
  expect(paper('lead').size / paper('title').size).toBeGreaterThanOrEqual(4 / 3);
  expect(paper('lead').family).toBe(paper('title').family);
  expect(paper('lead').size).toBeLessThan(paper('headline').size);
});

/** The four stops the body text reads at, which is the range the current app's own slider covers. */
test('the steps set the body text at 14, 16, 18 and 20 points', () => {
  expect(TEXT_SCALES.map((scale) => typographyAt('body', scale, 'paper').size)).toEqual([14, 16, 18, 20]);
});

test('every role at every step is a whole number of points, and grows with the step', () => {
  for (const variant of TEXT_VARIANTS) {
    const sizes = TEXT_SCALES.map((scale) => typographyAt(variant, scale, 'paper').size);
    for (const size of sizes) {
      expect(Number.isInteger(size)).toBe(true);
    }
    expect(sizes).toEqual([...sizes].sort((left, right) => left - right));
  }
});

test('a step changes the size and nothing else, the line height following from it', () => {
  const large = typographyAt('prose', 'huge', 'paper');
  expect(large.family).toBe(paper('prose').family);
  expect(large.leading).toBe(paper('prose').leading);
  expect(large.tone).toBe(paper('prose').tone);
  expect(large.size * large.leading).toBeCloseTo(32); // 20 × 1.6
});

/**
 * A reader who asks to read more easily gets that set everywhere: no role keeps a face of the paper's, which would
 * leave a headline or a caption in the one type they asked to be rid of.
 */
test('a set of faces answers for every role, and none falls back to the other set', () => {
  for (const variant of TEXT_VARIANTS) {
    expect(paper(variant).family).toMatch(/^(?:Overpass|Anton)_/u);
    expect(typographyAt(variant, 'normal', 'legible').family).toMatch(/^AtkinsonHyperlegible_/u);
  }
});

/**
 * The paper's name is set in the paper's own red and in nothing else. It shared the headline's tone for a while,
 * which turns white on the dark page along with every other headline — right for a headline, wrong for a masthead.
 */
test('the masthead is set in the paper’s mark, and no other role is', () => {
  expect(paper('masthead').tone).toBe('mark');
  expect(TEXT_VARIANTS.filter((variant) => paper(variant).tone === 'mark')).toEqual(['masthead']);
});

/**
 * Capitals and the air between them are one decision and are made once. A kicker set in capitals without tracking
 * reads as a single long word, and a role tracked without being set in capitals is just a loose line; the paper has
 * exactly one role that wants both, and none that wants either on its own.
 */
test('the kicker is the one role set in capitals, and the one role whose letters are opened', () => {
  expect(TEXT_VARIANTS.filter((variant) => paper(variant).caps)).toEqual(['kicker']);
  expect(TEXT_VARIANTS.filter((variant) => paper(variant).tracking > 0)).toEqual(['kicker']);
});

/** Tracking is a share of the size, like a line height, so the same air opens the letters at every reader step. */
test('the letters of a kicker open by the same share at every step', () => {
  const opened = TEXT_SCALES.map((scale) => {
    const role = typographyAt('kicker', scale, 'paper');
    return role.size * role.tracking;
  });
  expect(opened).toEqual([...opened].sort((left, right) => left - right));
  expect(new Set(TEXT_SCALES.map((scale) => typographyAt('kicker', scale, 'paper').tracking)).size).toBe(1);
});

test('a set of faces changes the letters and nothing else', () => {
  const legible = typographyAt('prose', 'large', 'legible');
  const own = typographyAt('prose', 'large', 'paper');
  expect(legible.size).toBe(own.size);
  expect(legible.leading).toBe(own.leading);
  expect(legible.tone).toBe(own.tone);
  expect(legible.family).not.toBe(own.family);
});
