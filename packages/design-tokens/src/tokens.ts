import type { Angle, FontFamily, FontSize, LineHeight, Radius, Space, Tracking } from './brand.ts';
import { angle, fontFamily, fontSize, lineHeight, radius, space, tracking } from './brand.ts';

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
 * Corner radii in points; the current app favours generous rounding (docs/app-actuelle).
 *
 * There was a fifth, `sheet`, at forty-eight: the corner a reading screen turned its white sheet by over the coloured
 * ground under it, and the corner the feed turned where one block of cards gave way to the next. Both are gone, and
 * the step goes with them. A corner that big is not how a paper prints anything — it is how a phone draws a modal,
 * and of the papers measured the only rounded-top surfaces in any stylesheet are share sheets and bottom modals.
 */
export const RADII = {
  sm: radius(6),
  md: radius(12),
  lg: radius(20),
  pill: radius(999),
} as const satisfies Readonly<Record<string, Radius>>;

/**
 * Font sizes in points; the body text measures 16 (docs/app-actuelle).
 *
 * `lg` and `xxl` are the two sizes a feed titles its cards in, and they used to be one. Every card set its title at
 * twenty, the story a front opens on no larger than any card far down a section, so nothing on a page ranked above
 * anything else but by the size of its picture. Laid out in Overpass Bold over the 375 items of the service's capture,
 * twenty points beside the ninety-six-point square of a line ran to six lines at the ninetieth percentile and nine at
 * most, and ran past the square on 45 % of them; eighteen keeps the median title to four lines of 20.7 points, which
 * the square holds on 73 %. A card the page raises sets its title a fourth above that, at twenty-four: four lines at
 * the median across the whole width, 110 points against 69 at twenty.
 *
 * `xxxl` is the largest the paper sets anything in, and it carries the two things printed in red: the paper's own name
 * and the headline of an article. Its value is not free. WCAG reads type as large from twenty-four points up, and a
 * reader may set the paper an eighth smaller than it is written; twenty-eight is the first step of the scale that
 * still clears twenty-four once taken down — 24.5, set at 25 — which is what lets either be printed in that red at
 * all. At 20 they would owe four and a half to one, and the paper's red gives 3.83 on a white page.
 *
 * There was a step above it, at thirty-four, and the headline was set in it. Three unrelated papers set a mobile
 * headline at twenty-eight — the Guardian's `headlineMedium28`, the BBC's own `max-width:599px` rule, Le Figaro's
 * `.fig-headline` — and none of the three is set in a condensed face. This one is: measured over the vendored files,
 * Anton's x-height is 0.732 em against Overpass's 0.511, so thirty-four points of Anton stand as tall as forty-nine
 * points of the text face. The headline was not a step larger than the reference; it was three quarters larger.
 */
export const FONT_SIZES = {
  xs: fontSize(12),
  sm: fontSize(14),
  md: fontSize(16),
  lg: fontSize(18),
  xl: fontSize(20),
  xxl: fontSize(24),
  xxxl: fontSize(28),
} as const satisfies Readonly<Record<string, FontSize>>;

/** Line heights as a multiple of the font size. */
export const LINE_HEIGHTS = {
  tight: lineHeight(1.15),
  normal: lineHeight(1.4),
  loose: lineHeight(1.6),
} as const satisfies Readonly<Record<string, LineHeight>>;

/**
 * The name of a face: four weights of body type, and the one a title is displayed in. It is written as a union and not
 * read off a list, nothing ever walking the faces — a set names all of them at once, and a role names exactly one.
 */
export type Face = 'light' | 'lightItalic' | 'regular' | 'bold' | 'display';

/** Which set of faces the paper is printed in; read off this list wherever a reader's choice is checked against it. */
export const FACE_SETS = ['paper', 'legible'] as const;

/** The name of a set of faces. */
export type FaceSet = (typeof FACE_SETS)[number];

/**
 * The faces, by set. The paper's own are Overpass for body text, one file per weight, and Anton for display titles
 * (docs/app-actuelle). A slanted face is loaded rather than asked for, because Android synthesises no italic: naming a
 * family that has no italic file and asking for one leaves the text upright, silently.
 *
 * The other set is Atkinson Hyperlegible, drawn by the Braille Institute to pull apart the letters that a reader most
 * often confuses — the l from the I and the 1, the O from the 0, the b from the d — and offered to a reader who asks
 * for it. It has four files where the paper has five faces, so it answers the light weight with its regular and the
 * display face with its bold: a set that reads more easily has no business printing a masthead in a display face
 * nobody chose it for.
 */
export const FONT_FAMILIES = {
  paper: {
    light: fontFamily('Overpass_300Light'),
    lightItalic: fontFamily('Overpass_300Light_Italic'),
    regular: fontFamily('Overpass_400Regular'),
    bold: fontFamily('Overpass_700Bold'),
    display: fontFamily('Anton_400Regular'),
  },
  legible: {
    light: fontFamily('AtkinsonHyperlegible_400Regular'),
    lightItalic: fontFamily('AtkinsonHyperlegible_400Regular_Italic'),
    regular: fontFamily('AtkinsonHyperlegible_400Regular'),
    bold: fontFamily('AtkinsonHyperlegible_700Bold'),
    display: fontFamily('AtkinsonHyperlegible_700Bold'),
  },
} as const satisfies Readonly<Record<FaceSet, Readonly<Record<Face, FontFamily>>>>;

/**
 * How far a role opens its letters, as a share of its own size rather than a length.
 *
 * It is a ratio for the same reason a line height is: a role is set at four sizes, one per reader step, and a spacing
 * written in points would be right at one of them and wrong at the other three. `wide` is what a line of small
 * capitals needs to stop reading as a word with its letters stuck together; everything else asks for nothing, and
 * says so.
 */
export const TRACKING = {
  none: tracking(0),
  wide: tracking(0.06),
} as const satisfies Readonly<Record<string, Tracking>>;

/**
 * Component sizes in points — heights the four-point SPACING grid does not reach.
 *
 * A list lays one band of its own: a masthead `headerExpanded` tall, which slides away as the list scrolls and which
 * the list's content starts under. There was a strip under it as well, of one `band` or of two stacked, with the scroll
 * inset of each arrangement named beside it; no screen laid one, and the four sizes went with it.
 *
 * `stroke` is the rule the paper draws where it draws one — the line a timeline hangs its items from, the line a field
 * is typed on. It is here rather than on the spacing grid because it is finer than the grid's smallest step.
 *
 * `bar` is the height of the bar every screen draws across its top, and `barSide` the width kept free at each of its
 * ends: the bar's own margin of eight points and the grid step square each end holds, the way back at one and the one
 * thing a screen offers at the other. The name in the middle is laid over the row between those two margins rather
 * than placed in it, so it sits in the middle of the screen whether the bar carries a control at one end, at both or
 * at neither — which is what a bar the platform lays out does, and what the app had to take over when it stopped
 * drawing one. It was eighty-eight, room for two controls at one end, which no screen hangs any more.
 *
 * `thumbnail` is the side of the small square picture a card in a line carries beside its standfirst, and `cover` the
 * width of a numéro standing on the newsstand's shelf. Both are widths, not heights, and the only two the paper names:
 * everything else a card lays out is a share of the screen it is given, while these have to be read against the width
 * the picture was written at — 320 points over 96 is the three-to-one a dense screen asks for, and a cover at 140 is
 * served by the 1080 the corpus writes. The shelf's own measurement is 138,3 points, read on capture 04 as a slot of
 * 363 pixels at 2,625 pixels per point; 140 is the step the grid holds nearest it.
 *
 * `headerExpanded` is what the sliding band holds, worked out rather than picked: one line of `display` type on the
 * page's own margin, which is what a screen with nothing better to print at its top prints there.
 *
 * Sixteen points of air above it, the type itself, and eight under — eight because the first row of a feed carries
 * sixteen of its own, and the twenty-four those add up to is the air the account screen leaves under its own name, a
 * screen that lays the same block in a plain scrolling page. At the step the paper is set at the type stands 20 × 1.15
 * = 23, so 16 + 23 + 8 = 47, and forty-eight is the grid step above it.
 *
 * A band is a fixed height and type is not, so the largest step a reader can choose is what decides whether the number
 * holds: 25 × 1.15 = 28.75, and 16 + 28.75 = 44.75 fits inside forty-eight with three to spare. The air under the name
 * closes from twenty-four points to nineteen as the type grows, which is what fixed room does and what nothing clipped
 * looks like. It was sixty-four, which no reading justified and which left the name floating seventeen points further
 * from the page than the same name on the account screen.
 */
export const SIZES = {
  headerExpanded: space(48),
  bar: space(56),
  barSide: space(56),
  stroke: space(2),
  thumbnail: space(96),
  cover: space(140),
} as const satisfies Readonly<Record<string, Space>>;

/**
 * The angles the journal lays its paper at. A linked card and a callout are printed as torn pieces of newsprint
 * dropped on the page, each turned very slightly to the left: measured at 1,24° to 1,51° across the three the captures
 * hold (12, 15, 16), which is one angle read three times rather than three angles.
 */
export const ANGLES = {
  paper: angle(-1.4),
} as const satisfies Readonly<Record<string, Angle>>;
