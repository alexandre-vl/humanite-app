import type { FontFamily, FontSize, LineHeight } from './brand.ts';
import { fontSize } from './brand.ts';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS } from './tokens.ts';

/** The theme colour a run of text paints with: a subset of the theme's colour roles, named where a text style is set. */
export type TextTone = 'textPrimary' | 'textMuted' | 'onPrimary' | 'headline' | 'primary';

/** A named text style: a face, a size, a line-height multiple and the tone it paints with unless a caller overrides it. */
export type Typography = Readonly<{ family: FontFamily; size: FontSize; leading: LineHeight; tone: TextTone }>;

/**
 * The face a run takes inside a paragraph, where the paragraph's own face is not the one to use. A run changes its
 * face and nothing else, so the size, the line height and the colour stay the paragraph's — which is what makes a
 * slanted word sit on the same baseline as the words around it. The slanted face is the light one because prose is
 * the only role that carries runs, and that is the face prose is set in.
 */
export const RUN_FACES = {
  italic: FONT_FAMILIES.body.lightItalic,
  strong: FONT_FAMILIES.body.bold,
} as const satisfies Readonly<Record<string, FontFamily>>;

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
 * closely. Prose differs from body by its face alone, and that is the measured difference: the current app sets its
 * article copy in a light face, scored 1.000 against Roboto Light and 0.943 against a regular one (README:97).
 */
export const TYPOGRAPHY = {
  headline: { family: FONT_FAMILIES.display, size: FONT_SIZES.xxl, leading: LINE_HEIGHTS.normal, tone: 'headline' },
  display: { family: FONT_FAMILIES.display, size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  title: { family: FONT_FAMILIES.body.bold, size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  standfirst: {
    family: FONT_FAMILIES.body.bold,
    size: FONT_SIZES.md,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
  },
  prose: { family: FONT_FAMILIES.body.light, size: FONT_SIZES.md, leading: LINE_HEIGHTS.loose, tone: 'textPrimary' },
  body: { family: FONT_FAMILIES.body.regular, size: FONT_SIZES.md, leading: LINE_HEIGHTS.loose, tone: 'textPrimary' },
  label: { family: FONT_FAMILIES.body.bold, size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textPrimary' },
  legend: {
    family: FONT_FAMILIES.body.lightItalic,
    size: FONT_SIZES.xs,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
  },
  caption: { family: FONT_FAMILIES.body.regular, size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textMuted' },
} as const satisfies Readonly<Record<TextVariant, Typography>>;

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
export const typographyAt = (variant: TextVariant, scale: TextScale): Typography => {
  const role = TYPOGRAPHY[variant];
  return { ...role, size: fontSize(Math.round(role.size * FACTORS[scale])) };
};
