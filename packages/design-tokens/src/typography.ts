import type { FontFamily, FontSize, LineHeight, Tracking } from './brand.ts';
import { fontSize } from './brand.ts';
import type { Theme } from './theme.ts';
import type { Face, FaceSet } from './tokens.ts';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, TRACKING } from './tokens.ts';

/**
 * The colours a run of text paints with: the subset of the theme's roles a text style may name.
 *
 * It is a list and not a bare union for the same reason the themes are, and it is held against the theme's own keys:
 * a tone that named a role no theme carries would read a colour that is not there, and the `satisfies` below refuses
 * it before anything renders.
 */
export const TEXT_TONES = [
  'textPrimary',
  'textSecondary',
  'textMuted',
  'onPrimary',
  'headline',
  'mark',
  'link',
] as const satisfies readonly (keyof Theme)[];

/** The name of a text colour. */
export type TextTone = (typeof TEXT_TONES)[number];

/**
 * A role of the table: which face it is set in, at what size, on what multiple, and the tone it paints with.
 *
 * Two roles also say how their letters stand. `caps` sets a line in capitals, which is what tells a reader that a
 * word above a headline names the section rather than opening the sentence; `tracking` opens the letters, because
 * capitals set at a word's spacing read as one long word. Both are left out wherever they are not wanted, so a table
 * row says only what departs from plain setting.
 */
type Role = Readonly<{
  face: Face;
  size: FontSize;
  leading: LineHeight;
  tone: TextTone;
  caps?: true;
  tracking?: Tracking;
}>;

/** A role resolved for a reader: everything a run of text is actually set in, with nothing left to decide. */
export type Typography = Readonly<{
  family: FontFamily;
  size: FontSize;
  leading: LineHeight;
  tone: TextTone;
  caps: boolean;
  tracking: Tracking;
}>;

/**
 * The face a run takes inside a paragraph, where the paragraph's own face is not the one to use. A run changes its
 * face and nothing else, so the size, the line height and the colour stay the paragraph's — which is what makes a
 * slanted word sit on the same baseline as the words around it. The slanted face is the light one because prose is
 * the only role that carries runs, and that is the face prose is set in.
 */
export const RUN_FACES = {
  italic: 'lightItalic',
  strong: 'bold',
} as const satisfies Readonly<Record<string, Face>>;

/** The name of a run's face. */
export type RunFace = keyof typeof RUN_FACES;

/** The names of the app's text styles, in the order a catalogue lists them: widest first, down to the finest print. */
export const TEXT_VARIANTS = [
  'headline',
  'masthead',
  'display',
  'title',
  'standfirst',
  'summary',
  'prose',
  'body',
  'label',
  'legend',
  'caption',
  'kicker',
] as const;

/** The name of a text style. */
export type TextVariant = (typeof TEXT_VARIANTS)[number];

/**
 * The app's text styles, one per role (docs/app-actuelle). A component names a role and the Text primitive derives the
 * absolute line height from the size and the multiple, so a raw size, face or text colour never enters a style.
 *
 * Two reading roles are set from the article captures, read at 2.625 px per point (the 24-point gesture bar measures
 * 63 px): a legend steps 16.0 points and the table gives 12 × 1.4 = 16.8; prose steps 23.8 against the table's
 * 16 × 1.6 = 25.6, the one role the scale reaches least closely. The headline was the third — it steps 47.0, and the
 * table gave 34 × 1.4 = 47.6 — and it left the capture on purpose: see the note on `xl` beside the sizes. Prose differs
 * from body by its face alone, and that is what was measured: the current app sets its article copy in a light weight,
 * matched word for word at 1.000 against Roboto Light, the next candidate — Overpass Light — scoring 0.943 (README:97).
 * It is the weight that carries over and not the family: the site declares Overpass and this app is set in it
 * throughout, while the current app shows its copy in Roboto (README:103).
 *
 * `standfirst` and `summary` were one role and had to become two. A card and an article both carry a sentence under
 * their title, and the two are not the same sentence: on an article it is the opening of the piece, read straight
 * after the headline and before the body; on a card it is what answers the title in a list of
 * twenty others. Set as one, it was bold and in the ink of the title — so on a card it read as a second title, and
 * on an article it read as no larger than the body it introduced. The article's is now regular at twenty points and
 * keeps the ink; the card's is regular at sixteen in the middle ink.
 *
 * `masthead` is the paper's own name, which was set in `display` — twenty points, the size of a card's title — so
 * the front page opened on a name no larger than the first headline under it. It is set in the red the paper is
 * printed in, which a smaller size would forbid: see the note on `xl` beside the sizes. That red is `mark` and not
 * `headline`, which turns white on the dark page along with every other headline; a headline is type and a masthead
 * is the paper. It measures what a headline measures and is a role of its own all the same: one is a line that never
 * wraps and the other is four that do, and what they may be asked to do next is not the same thing.
 *
 * `headline` sets an article's own title and nothing else. It used to set three more things — the crossheads inside a
 * body, the label over a linked article, the title of a call for support — so an article printed its own title four
 * times over in the same red at the same size, each shouting as loud as the piece it belonged to. A headline is the
 * one line of a screen that must be read first; a table that hands the same type to whatever else wants to be large
 * has no way of saying so. Its leading is `tight` because that is what a headline set over four lines wants, and what
 * the Guardian's own `headlineMedium28` and the BBC's mobile rule both set: 1.15 and 1.21.
 *
 * `kicker` is a label rather than a line: the word that marks what an item is or who may read it, and the name over a
 * block an article sets apart, in small capitals. It is the one role whose letters are set apart — the only way twelve
 * points of type reads as a label and not as the first line of the title under it.
 */
const TYPOGRAPHY = {
  headline: { face: 'display', size: FONT_SIZES.xl, leading: LINE_HEIGHTS.tight, tone: 'headline' },
  masthead: { face: 'display', size: FONT_SIZES.xl, leading: LINE_HEIGHTS.tight, tone: 'mark' },
  display: { face: 'display', size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  title: { face: 'bold', size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  standfirst: {
    face: 'regular',
    size: FONT_SIZES.lg,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
  },
  summary: {
    face: 'regular',
    size: FONT_SIZES.md,
    leading: LINE_HEIGHTS.normal,
    tone: 'textSecondary',
  },
  prose: { face: 'light', size: FONT_SIZES.md, leading: LINE_HEIGHTS.loose, tone: 'textPrimary' },
  body: { face: 'regular', size: FONT_SIZES.md, leading: LINE_HEIGHTS.loose, tone: 'textPrimary' },
  label: { face: 'bold', size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textPrimary' },
  legend: {
    face: 'lightItalic',
    size: FONT_SIZES.xs,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
  },
  caption: { face: 'regular', size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textMuted' },
  kicker: {
    face: 'bold',
    size: FONT_SIZES.xs,
    leading: LINE_HEIGHTS.normal,
    tone: 'textMuted',
    caps: true,
    tracking: TRACKING.wide,
  },
} as const satisfies Readonly<Record<TextVariant, Role>>;

/** The steps a reader may set the text at, from the smallest to the largest. */
export const TEXT_SCALES = ['small', 'normal', 'large', 'huge'] as const;

/** The name of a text step. */
export type TextScale = (typeof TEXT_SCALES)[number];

/**
 * What each step multiplies a size by. The steps are eighths around the one the paper is set at, so the body text
 * reads 14, 16, 18 and 20 points — the range the current app's own slider covers, in four named stops rather than a
 * continuum a finger cannot hold. Sizes are rounded to the point: a face is hinted at whole sizes, and a table of
 * fractions would print the same letters while reading worse.
 */
const FACTORS = {
  small: 0.875,
  normal: 1,
  large: 1.125,
  huge: 1.25,
} as const satisfies Readonly<Record<TextScale, number>>;

/**
 * A variant as it is set at a chosen step: its own face, tone and line-height multiple, at the size the step gives.
 *
 * The arithmetic is here and not in the app because a size is a branded token, and only this package mints one; an
 * app that could multiply a size could write any number into a style. The line height follows for nothing, being a
 * multiple of the size rather than a length.
 *
 * This is the app's own step, not the system's. A phone already scales every text by the setting its owner chose, and
 * this app has always obeyed it; what a reader sets here multiplies that, for the one reading they do in this paper.
 */
export const typographyAt = (variant: TextVariant, scale: TextScale, faces: FaceSet): Typography => {
  // Widened to the role type on the way out: the table is written `as const`, so a row that sets neither capitals nor
  // tracking has no such property at all, and asking a literal for a field it does not carry is an error rather than
  // an absence. Read as a `Role`, the two are optional and answer `undefined`, which is what they mean.
  const role: Role = TYPOGRAPHY[variant];
  return {
    family: FONT_FAMILIES[faces][role.face],
    size: fontSize(Math.round(role.size * FACTORS[scale])),
    leading: role.leading,
    tone: role.tone,
    caps: role.caps ?? false,
    tracking: role.tracking ?? TRACKING.none,
  };
};
