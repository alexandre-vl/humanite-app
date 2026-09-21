import type { FontFamily, FontSize, LineHeight } from './brand.ts';
import { fontSize } from './brand.ts';
import type { Theme } from './theme.ts';
import type { Face, FaceSet } from './tokens.ts';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS } from './tokens.ts';

/**
 * The colours a run of text paints with: the subset of the theme's roles a text style may name.
 *
 * It is a list and not a bare union for the same reason the themes are, and it is held against the theme's own keys:
 * a tone that named a role no theme carries would read a colour that is not there, and the `satisfies` below refuses
 * it before anything renders.
 */
export const TEXT_TONES = [
  'textPrimary',
  'textMuted',
  'onPrimary',
  'headline',
  'link',
] as const satisfies readonly (keyof Theme)[];

/** The name of a text colour. */
export type TextTone = (typeof TEXT_TONES)[number];

/** A role of the table: which face it is set in, at what size, on what multiple, and the tone it paints with. */
type Role = Readonly<{ face: Face; size: FontSize; leading: LineHeight; tone: TextTone }>;

/** A role resolved for a reader: the family, size, multiple and tone a run of text is actually set in. */
export type Typography = Readonly<{ family: FontFamily; size: FontSize; leading: LineHeight; tone: TextTone }>;

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
  'display',
  'title',
  'standfirst',
  'prose',
  'body',
  'label',
  'legend',
  'caption',
] as const;

/** The name of a text style. */
export type TextVariant = (typeof TEXT_VARIANTS)[number];

/**
 * The app's text styles, one per role (docs/app-actuelle). A component names a role and the Text primitive derives the
 * absolute line height from the size and the multiple, so a raw size, face or text colour never enters a style.
 *
 * The three reading roles are set from the article captures, read at 2.625 px per point (the 24-point gesture bar
 * measures 63 px): a headline steps 47.0 points and the table gives 34 × 1.4 = 47.6; a legend steps 16.0 and the table
 * gives 12 × 1.4 = 16.8; prose steps 23.8 against the table's 16 × 1.6 = 25.6, the one role the scale reaches least
 * closely. Prose differs from body by its face alone, and that is what was measured: the current app sets its article
 * copy in a light weight, matched word for word at 1.000 against Roboto Light, the next candidate — Overpass Light —
 * scoring 0.943 (README:97). It is the weight that carries over and not the family: the site declares Overpass and
 * this app is set in it throughout, while the current app shows its copy in Roboto (README:103).
 */
const TYPOGRAPHY = {
  headline: { face: 'display', size: FONT_SIZES.xxl, leading: LINE_HEIGHTS.normal, tone: 'headline' },
  display: { face: 'display', size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  title: { face: 'bold', size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  standfirst: {
    face: 'bold',
    size: FONT_SIZES.md,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
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
  const role = TYPOGRAPHY[variant];
  return {
    family: FONT_FAMILIES[faces][role.face],
    size: fontSize(Math.round(role.size * FACTORS[scale])),
    leading: role.leading,
    tone: role.tone,
  };
};
