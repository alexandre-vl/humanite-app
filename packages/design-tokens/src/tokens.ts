import type { Angle, Duration, FontFamily, FontSize, LineHeight, Radius, Space } from './brand.ts';
import { angle, duration, fontFamily, fontSize, lineHeight, radius, space } from './brand.ts';

/** Spacing scale in points, on a four-point grid. */
export const SPACING = {
  none: space(0),
  xs: space(4),
  sm: space(8),
  md: space(12),
  lg: space(16),
  xl: space(24),
  xxl: space(32),
  xxxl: space(48),
} as const satisfies Readonly<Record<string, Space>>;

/**
 * Corner radii in points; the current app favours generous rounding (docs/app-actuelle). `sheet` is the one a reading
 * screen turns the top-left corner of its sheet by, measured on capture 13 as a circle of radius 129 px — 49 points —
 * fitted over 134 rows to within half a pixel, against a top-right corner left square.
 */
export const RADII = {
  none: radius(0),
  sm: radius(6),
  md: radius(12),
  lg: radius(20),
  sheet: radius(48),
  pill: radius(999),
} as const satisfies Readonly<Record<string, Radius>>;

/** Font sizes in points; the body text measures 16 (docs/app-actuelle). */
export const FONT_SIZES = {
  xs: fontSize(12),
  sm: fontSize(14),
  md: fontSize(16),
  lg: fontSize(20),
  xl: fontSize(26),
  xxl: fontSize(34),
} as const satisfies Readonly<Record<string, FontSize>>;

/** Line heights as a multiple of the font size. */
export const LINE_HEIGHTS = {
  tight: lineHeight(1.15),
  normal: lineHeight(1.4),
  loose: lineHeight(1.6),
} as const satisfies Readonly<Record<string, LineHeight>>;

/**
 * Font families: Overpass for body text, one face per weight; Anton for display titles (docs/app-actuelle). A slanted
 * face is loaded rather than asked for, because Android synthesises no italic: naming a family that has no italic file
 * and asking for one leaves the text upright, silently.
 */
export const FONT_FAMILIES = {
  body: {
    light: fontFamily('Overpass_300Light'),
    lightItalic: fontFamily('Overpass_300Light_Italic'),
    regular: fontFamily('Overpass_400Regular'),
    bold: fontFamily('Overpass_700Bold'),
  },
  display: fontFamily('Anton_400Regular'),
} as const satisfies Readonly<{ body: Readonly<Record<string, FontFamily>>; display: FontFamily }>;

/**
 * Component sizes in points — heights the four-point SPACING grid does not reach.
 *
 * A list lays its own bands: a masthead that slides away as it scrolls, from `headerExpanded` down to
 * `headerCollapsed`, and under it a strip that stays, of one `band` or of two stacked. The scroll inset each
 * arrangement adds up to is named too, because a style table is built once and cannot add.
 *
 * `stroke` is the rule the paper draws where it draws one — the line a timeline hangs its items from, the line a field
 * is typed on — and `ring` the hollow mark on it: both finer than the grid's smallest step.
 */
const HEADER_EXPANDED = 64;
const BAND = 40;
export const SIZES = {
  headerExpanded: space(HEADER_EXPANDED),
  headerCollapsed: space(0),
  band: space(BAND),
  bandPair: space(BAND * 2),
  headerBand: space(HEADER_EXPANDED + BAND),
  headerBandPair: space(HEADER_EXPANDED + BAND * 2),
  stroke: space(2),
  ring: space(12),
} as const satisfies Readonly<Record<string, Space>>;

/**
 * The angles the journal lays its paper at. A linked card and a callout are printed as torn pieces of newsprint
 * dropped on the page, each turned very slightly to the left: measured at 1,24° to 1,51° across the three the captures
 * hold (12, 15, 16), which is one angle read three times rather than three angles.
 */
export const ANGLES = {
  paper: angle(-1.4),
} as const satisfies Readonly<Record<string, Angle>>;

/** Animation durations in milliseconds. */
export const DURATIONS = {
  instant: duration(0),
  fast: duration(150),
  normal: duration(250),
  slow: duration(400),
} as const satisfies Readonly<Record<string, Duration>>;

/** The same durations with motion removed, for the reduce-motion setting. */
export const REDUCED_DURATIONS = {
  instant: duration(0),
  fast: duration(0),
  normal: duration(0),
  slow: duration(0),
} as const satisfies Readonly<Record<keyof typeof DURATIONS, Duration>>;
