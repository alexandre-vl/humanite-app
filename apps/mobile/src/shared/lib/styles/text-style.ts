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

/** The style a named variant paints with, in the theme in force, with the tone and the alignment a caller may set. */
export function textStyle(
  variant: TextVariant,
  theme: Theme,
  tone: TextTone | undefined,
  align: TextAlign | undefined,
): TextStyle {
  const role = TYPOGRAPHY[variant];
  return {
    fontFamily: role.family,
    fontSize: role.size,
    lineHeight: role.size * role.leading,
    color: theme[tone ?? role.tone],
    ...(align === undefined ? {} : { textAlign: align }),
  };
}

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
