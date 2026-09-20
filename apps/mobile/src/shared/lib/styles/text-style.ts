import type { Color, FontFamily, FontSize, RunFace, TextTone, TextVariant, Theme } from '@huma/design-tokens';
import { RUN_FACES, TYPOGRAPHY } from '@huma/design-tokens';

/** How a run of text sits across its column. */
export type TextAlign = 'left' | 'center';

/**
 * A style a run of text carries. It is the other half of what `createStyles` builds: that one dresses views and holds
 * no typography, this one holds nothing else. A line height is the one plain number either side allows, because it is
 * not a token but a size times its multiple, derived here and nowhere else. It needs no opaque handle the way a
 * `StyleRef` does: no prop takes one, so the only styles that reach a native text are the two this module returns.
 */
export type TextStyle = Readonly<{
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  lineHeight?: number;
  color?: Color;
  textAlign?: TextAlign;
}>;

/** The face, the size and the colour a variant is set in: everything about its letters, nothing about its lines. */
const faceOf = (variant: TextVariant, theme: Theme, tone: TextTone | undefined): TextStyle => {
  const role = TYPOGRAPHY[variant];
  return { fontFamily: role.family, fontSize: role.size, color: theme[tone ?? role.tone] };
};

/** The style a named variant paints with, in the theme in force, with the tone and the alignment a caller may set. */
export function textStyle(
  variant: TextVariant,
  theme: Theme,
  tone: TextTone | undefined,
  align: TextAlign | undefined,
): TextStyle {
  const role = TYPOGRAPHY[variant];
  return {
    ...faceOf(variant, theme, tone),
    lineHeight: role.size * role.leading,
    ...(align === undefined ? {} : { textAlign: align }),
  };
}

/**
 * The style typed text carries: the variant's own, less the line height. A field holds one line, so it has no lines to
 * stack; and Android lays a line height out from the top of the box rather than around the letters, which lifts what
 * is being typed off the baseline its placeholder sat on. The face and the size are read from the same table as a
 * paragraph's, so a field and the text around it are set in the same type.
 */
export const inputStyle = (variant: TextVariant, theme: Theme): TextStyle => faceOf(variant, theme, undefined);

/**
 * The colour a piece of text the platform draws itself is set in — a label under a tab bar, a title in a native
 * header. Such a bar lays its own letters out and takes no table of styles; the colour is the one thing it lets the
 * app decide, and it is a theme's to give, so it is named here rather than written at the bar.
 */
export const chromeStyle = (tone: TextTone, theme: Theme): TextStyle => ({ color: theme[tone] });

/**
 * The style one run inside a paragraph departs by: a face when it is set apart, the primary colour when it answers a
 * press. Everything it leaves out — the size, the line height, the colour of the paragraph — React Native inherits
 * from the text that encloses it, which is what keeps a slanted word on its neighbours' baseline.
 */
export function runStyle(face: RunFace | undefined, pressable: boolean, theme: Theme): TextStyle {
  return {
    ...(face === undefined ? {} : { fontFamily: RUN_FACES[face] }),
    ...(pressable ? { color: theme.primary } : {}),
  };
}
