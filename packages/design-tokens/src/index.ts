export type { Angle, Brand, Color, FontFamily, FontSize, LineHeight, Radius, Space } from './brand.ts';
export { PALETTE } from './palette.ts';
export type { FaceSet } from './tokens.ts';
// `TRACKING` is not here, and neither is its brand: the table is read by the typography beside it and by nothing
// outside this package. What an app names is a variant, and the letters that variant opens are the table's business.
export { ANGLES, FACE_SETS, FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, RADII, SIZES, SPACING } from './tokens.ts';
export { contrastRatio } from './contrast.ts';
export type { LegibilityCode, LegibilityTables } from './legibility.ts';
// The tables themselves stay inside the package: what leaves it is the reading of them and the paper's own set, so a
// bench can hand the reading a broken table and read the code that comes back.
export { judgeLegibility, THE_PAPER } from './legibility.ts';
export type { SectionCode } from './sections.ts';
export { SECTION_COLORS, sectionColor } from './sections.ts';
export type { Theme, ThemeChoice, ThemeName } from './theme.ts';
export { DARK_THEME, LIGHT_THEME, THEME_CHOICES, THEME_NAMES, THEMES } from './theme.ts';
export type { RunFace, TextScale, TextTone, TextVariant, Typography } from './typography.ts';
export { RUN_FACES, TEXT_SCALES, TEXT_VARIANTS, typographyAt } from './typography.ts';
