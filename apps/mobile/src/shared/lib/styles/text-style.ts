import type {
  Color,
  FaceSet,
  FontFamily,
  FontSize,
  RunFace,
  TextTone,
  TextVariant,
  Theme,
  Typography,
} from '@huma/design-tokens';
import { FONT_FAMILIES, RUN_FACES, typographyAt } from '@huma/design-tokens';
import type { Typesetting } from './typesetting';

/** How a run of text sits across its column. */
export type TextAlign = 'left' | 'center';

/**
 * A style a run of text carries. It is the other half of what `createStyles` builds: that one dresses views and holds
 * no typography, this one holds nothing else. Two plain numbers are allowed here and nowhere else — the line height
 * and the letter spacing — because neither is a token: each is a size times a ratio the table holds, derived here so
 * that a role set at four reader steps opens its lines and its letters by the same share at every one of them. The
 * style needs no opaque handle the way a `StyleRef` does: no prop takes one, so the only styles that reach a native
 * text are the two this module returns.
 */
export type TextStyle = Readonly<{
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
  color?: Color;
  textAlign?: TextAlign;
}>;

/** The face, the size and the colour a role is set in: everything about its letters, nothing about its lines. */
const faceOf = (role: Typography, theme: Theme, tone: TextTone | undefined): TextStyle => ({
  fontFamily: role.family,
  fontSize: role.size,
  color: theme[tone ?? role.tone],
});

/**
 * The style a named variant paints with: in the theme in force and at the step the reader set, with the tone and the
 * alignment a caller may override. The step reaches every letter of the app through here, and the line height with
 * them, being a multiple of a size rather than a length of its own.
 */
export function textStyle(
  variant: TextVariant,
  theme: Theme,
  typesetting: Typesetting,
  tone: TextTone | undefined,
  align: TextAlign | undefined,
): TextStyle {
  const role = typographyAt(variant, typesetting.scale, typesetting.faces);
  return {
    ...faceOf(role, theme, tone),
    lineHeight: role.size * role.leading,
    letterSpacing: role.size * role.tracking,
    ...(role.caps ? { textTransform: 'uppercase' } : {}),
    ...(align === undefined ? {} : { textAlign: align }),
  };
}

/**
 * The style typed text carries: the variant's own, less the line height. A field holds one line, so it has no lines to
 * stack; and Android lays a line height out from the top of the box rather than around the letters, which lifts what
 * is being typed off the baseline its placeholder sat on. The face and the size are read from the same table as a
 * paragraph's, so a field and the text around it are set in the same type.
 */
export const inputStyle = (variant: TextVariant, theme: Theme, typesetting: Typesetting): TextStyle =>
  faceOf(typographyAt(variant, typesetting.scale, typesetting.faces), theme, undefined);

/**
 * The style one run inside a paragraph departs by: a face when it is set apart, the link colour and a line under it
 * when it answers a press. Everything it leaves out — the size, the line height, the colour of the paragraph — React
 * Native inherits from the text that encloses it, which is what keeps a slanted word on its neighbours' baseline.
 *
 * The colour is `link` and not `primary` because this red is a letter and not a ground, and the two want the red from
 * opposite ends; the theme holds which is which. The line is there because a colour alone does not say it: the
 * link's red measures 3.54 to 1 against the paragraph's ink on the phone, and a reader who does not see red sees a
 * word like the others.
 */
export function runStyle(face: RunFace | undefined, pressable: boolean, theme: Theme, faces: FaceSet): TextStyle {
  return {
    ...(face === undefined ? {} : { fontFamily: FONT_FAMILIES[faces][RUN_FACES[face]] }),
    ...(pressable ? { color: theme.link, textDecorationLine: 'underline' } : {}),
  };
}
