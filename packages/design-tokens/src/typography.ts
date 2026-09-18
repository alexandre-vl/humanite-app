import type { FontFamily, FontSize, LineHeight } from './brand.ts';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS } from './tokens.ts';

/** The theme colour a run of text paints with: a subset of the theme's colour roles, named where a text style is set. */
export type TextTone = 'textPrimary' | 'textMuted' | 'textInverse' | 'primary';

/** A named text style: a face, a size, a line-height multiple and the tone it paints with unless a caller overrides it. */
type Typography = Readonly<{ family: FontFamily; size: FontSize; leading: LineHeight; tone: TextTone }>;

/** The names of the app's text styles, in the order a catalogue lists them. */
export const TEXT_VARIANTS = ['display', 'title', 'standfirst', 'body', 'label', 'caption'] as const;

/** The name of a text style. */
export type TextVariant = (typeof TEXT_VARIANTS)[number];

/**
 * The app's text styles, one per role (docs/app-actuelle). A component names a role and the Text primitive derives the
 * absolute line height from the size and the multiple, so a raw size, face or text colour never enters a style.
 */
export const TYPOGRAPHY = {
  display: { family: FONT_FAMILIES.display, size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  title: { family: FONT_FAMILIES.body.bold, size: FONT_SIZES.lg, leading: LINE_HEIGHTS.tight, tone: 'textPrimary' },
  standfirst: {
    family: FONT_FAMILIES.body.bold,
    size: FONT_SIZES.md,
    leading: LINE_HEIGHTS.normal,
    tone: 'textPrimary',
  },
  body: { family: FONT_FAMILIES.body.regular, size: FONT_SIZES.md, leading: LINE_HEIGHTS.loose, tone: 'textPrimary' },
  label: { family: FONT_FAMILIES.body.bold, size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textPrimary' },
  caption: { family: FONT_FAMILIES.body.regular, size: FONT_SIZES.sm, leading: LINE_HEIGHTS.normal, tone: 'textMuted' },
} as const satisfies Readonly<Record<TextVariant, Typography>>;
