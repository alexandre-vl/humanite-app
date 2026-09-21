import type { Color } from './brand.ts';
import { PALETTE } from './palette.ts';

/**
 * The semantic colour roles a screen paints with, one value per theme.
 *
 * `onPrimary` is the text a screen lays on `primary`: the wire of En continu paints its whole ground in it, and a
 * button its pill. Both themes give it the same value, because `primary` itself is the same red in both — a surface
 * that does not change between themes cannot ask for two different texts on it.
 *
 * `ground` is what a reading screen lays its sheet of `background` on, and `headline` the colour a headline takes
 * there. The dark article of the current app needs no rule of its own for either: its ground and its sheet are the
 * same value, so the sheet stops showing, and its headline turns white where the light one is red (captures 11, 13).
 *
 * There was a `block` as well: a second ground a feed printed on, taken in turn with the page's own every three cards
 * so that a run of them read as one block and the next as another (captures 18, 19). No front worth copying does
 * that. The Guardian, the BBC, Le Monde and NPR each print one ground and separate cards with a hairline, and the
 * Guardian's own container palettes are reserved for a container the desk has marked. What the alternation was really
 * saying is what NN/g calls the illusion of completeness — a contrasting full-width edge reads as the bottom of the
 * page — so the paper prints on one ground and draws `rule` where a card ends.
 *
 * `mark` is the paper's name, and it is the one red that is the same in both themes. It was set in `headline` and
 * turned white on the dark page with every other headline — which is right for a headline and wrong for a masthead:
 * a headline is type, and a masthead is the paper. The red reads on both pages (3.83 on the light one, where the
 * name is large enough to owe only three, and 4.81 on the dark one), so the one thing that never changes is the one
 * thing that never changes.
 *
 * `textSecondary` is the middle of three inks, and it exists because a card has three things to say and had only two
 * voices for them. The title and the summary under it were printed in the same colour and the same weight, four
 * points apart: two titles, one of them inexplicably small. An ink sits between them now — near half the contrast of
 * the one above, near twice the one below — so the order in which a card is read is set by the ink and not only by
 * the size.
 *
 * `link` is the red a word takes when pressing it goes somewhere, and it is not `primary` for the reason `headline`
 * is not one value either: a ground and a letter want the red from opposite ends. A ground carrying white has to be
 * dark enough to carry it; a letter on a light page has to be dark enough to be read, and a letter on a dark page
 * has to be light enough. The paper's own red answers only the last of those — 4.81 to 1 on the dark page, 3.83 on
 * the light one — so the light theme writes its links in the deeper `inkRed` and the dark theme in the red itself.
 *
 * `rule` is the line the paper actually draws, and `border` is not it. The one rule in the app — under what an
 * article says about itself, before the article itself — was painted in `border`, which is the light theme's ground
 * for a block: 1.13 to one against the page, a separator nobody has ever seen. A rule is not a ground and owes
 * nothing to WCAG, which asks nothing of a line carrying no meaning of its own; it owes only to be there, and at
 * 1.43 on the light page and 1.52 on the dark one it is.
 *
 * `control` is the track of a switch when it is off, and it is one value in both themes although the light theme
 * paints muted text the same. A muted word owes one thing: to be read on the page. A track owes three — to be found
 * on the page, to be told from the knob riding on it, and to stay told from it when the knob is the text colour. Only
 * a value near the middle of the two pages answers all three, and the dark theme's muted grey does not: the knob
 * measured 2.11 to 1 against it. The switch is the app's one drawn control, so the role is named for what it draws
 * rather than for the one component that uses it.
 */
export type Theme = Readonly<{
  background: Color;
  ground: Color;
  surface: Color;
  card: Color;
  textPrimary: Color;
  textSecondary: Color;
  textMuted: Color;
  onPrimary: Color;
  headline: Color;
  mark: Color;
  link: Color;
  primary: Color;
  premium: Color;
  border: Color;
  rule: Color;
  control: Color;
}>;

/** The light theme, built from the measured palette. */
export const LIGHT_THEME = {
  background: PALETTE.white,
  ground: PALETTE.blueGrey,
  surface: PALETTE.white,
  card: PALETTE.paleGrey,
  textPrimary: PALETTE.aubergine,
  textSecondary: PALETTE.inkGrey,
  textMuted: PALETTE.dateGrey,
  onPrimary: PALETTE.white,
  headline: PALETTE.uiRed,
  mark: PALETTE.uiRed,
  link: PALETTE.inkRed,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.blueGrey,
  rule: PALETTE.ruleGrey,
  control: PALETTE.dateGrey,
} as const satisfies Theme;

/** The dark theme, derived from the measured dark background #141414. */
export const DARK_THEME = {
  background: PALETTE.darkBackground,
  ground: PALETTE.darkBackground,
  surface: PALETTE.darkSurface,
  card: PALETTE.darkCard,
  textPrimary: PALETTE.paleGrey,
  textSecondary: PALETTE.darkSecondary,
  textMuted: PALETTE.darkMuted,
  onPrimary: PALETTE.white,
  headline: PALETTE.white,
  mark: PALETTE.uiRed,
  link: PALETTE.uiRed,
  primary: PALETTE.uiRed,
  premium: PALETTE.premiumYellow,
  border: PALETTE.darkBorder,
  rule: PALETTE.darkRule,
  control: PALETTE.dateGrey,
} as const satisfies Theme;

/**
 * The themes the paper publishes, named once.
 *
 * The list comes before the table rather than out of it: `Object.keys` answers with plain strings, and the one cast
 * that would narrow them back is the cast this repository forbids. Written this way, the `satisfies` below refuses a
 * name without a theme and a theme without a name, and the reader's choices below are built from the same list.
 */
export const THEME_NAMES = ['light', 'dark'] as const;

/** The name of a theme. */
export type ThemeName = (typeof THEME_NAMES)[number];

/** The themes by name. */
export const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const satisfies Readonly<Record<ThemeName, Theme>>;

/**
 * What a reader may set the paper's colours to: either theme by name, or whichever the phone is in.
 *
 * `system` is not a third theme but the absence of a choice, which is why it is named here beside the others rather
 * than added to them: a table of themes answers with colours, and this answers which of them to ask for.
 */
export const THEME_CHOICES = ['system', ...THEME_NAMES] as const;

/** The name of a theme choice. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];
