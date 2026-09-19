import type { Duration, FontFamily, FontSize, LineHeight, Radius, Space } from './brand.ts';
import { duration, fontFamily, fontSize, lineHeight, radius, space } from './brand.ts';

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

/** Corner radii in points; the current app favours generous rounding (docs/app-actuelle). */
export const RADII = {
  none: radius(0),
  sm: radius(6),
  md: radius(12),
  lg: radius(20),
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

/** Font families: Overpass for body text, one face per weight; Anton for display titles (docs/app-actuelle). */
export const FONT_FAMILIES = {
  body: {
    light: fontFamily('Overpass_300Light'),
    regular: fontFamily('Overpass_400Regular'),
    bold: fontFamily('Overpass_700Bold'),
  },
  display: fontFamily('Anton_400Regular'),
} as const satisfies Readonly<{
  body: Readonly<Record<'light' | 'regular' | 'bold', FontFamily>>;
  display: FontFamily;
}>;

/**
 * Component sizes in points: the collapsible header's expanded and collapsed bands, its sticky section bar, and the
 * scroll inset those add up to — heights the four-point SPACING grid does not reach. `stroke` and `ring` draw the
 * rule a timeline hangs its items from, finer than the grid's smallest step.
 */
const HEADER_EXPANDED = 64;
const SECTION_BAR = 40;
export const SIZES = {
  headerExpanded: space(HEADER_EXPANDED),
  headerCollapsed: space(0),
  sectionBar: space(SECTION_BAR),
  headerBlock: space(HEADER_EXPANDED + SECTION_BAR),
  stroke: space(2),
  ring: space(12),
} as const satisfies Readonly<Record<string, Space>>;

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
