import type { Theme } from './theme.ts';
import type { TextTone, TextVariant } from './typography.ts';

/**
 * What the paper owes a reader who has to be able to see it, written so a test can ask rather than a person remember.
 *
 * What stood here before was a set of thresholds chosen by hand, one per pair somebody had thought of, each named
 * after the bar it had picked — and one of them read "muted text meets WCAG AA for large text", asking three to one
 * of a caption set in fourteen points of regular type, which is not large text and never was. The bar was right for
 * its name and the name was wrong for the text, and nothing could say so: the table that holds how big a variant is
 * set and the table that holds what contrast it owes did not know about each other.
 *
 * So the threshold is derived instead, from the smallest type each colour is ever set in, at the smallest step a
 * reader can choose. Of the nine variants exactly one — the headline, at thirty-four points — is large text by WCAG's
 * measure. The other eight owe four and a half to one, and six of them were being held to three.
 */

/**
 * The roles a screen paints behind text. `premium` is not among them: the one mark printed on it builds itself inside
 * a light scope, so that pairing is a single fixed one rather than one per theme, and the theme test pins it there.
 */
export const GROUNDS = [
  'background',
  'ground',
  'surface',
  'card',
  'border',
  'primary',
] as const satisfies readonly (keyof Theme)[];

/** A role of the theme a screen paints behind text. */
type Ground = (typeof GROUNDS)[number];

/** Where one colour of text is printed: in the smallest type it is ever set in, and on the grounds it is laid on. */
type Printing = Readonly<{ smallest: TextVariant; grounds: readonly Ground[] }>;

/**
 * Where each colour of text is printed, read off the screens that print it.
 *
 * It is a declaration and not a derivation because nothing in a style table says which text lands on which ground: a
 * background is set on one view and a colour on another, and only the screen between them knows the two meet. Naming
 * the pairs is what lets the rule ask about the pairs the paper prints instead of every pair it could — white on the
 * red of the wire is a pairing the paper prints, white on the page is not, and a rule that asked about both would
 * fail on a screen nobody has drawn.
 *
 * `smallest` is what fixes the bar, a smaller type owing more contrast than a larger one. It names the variant and
 * not a number so that a change of type carries here by itself.
 */
export const PRINTINGS = {
  // The page a feed and an article are printed on, the torn paper a linked card is dropped on, the sheet a group of
  // rows is laid on, the bar a row of labels sits in, and the masthead of the front page, which is painted in the
  // rule colour. Smallest in a picture's legend, and in the word that marks a column.
  textPrimary: {
    smallest: 'legend',
    grounds: ['background', 'ground', 'surface', 'card', 'border'],
  },
  // What answers a title on a card, and the standfirst of an article.
  textSecondary: { smallest: 'summary', grounds: ['background'] },
  // The count under a cover, the hint under a row of settings, the signature of a column, and the smallest of them
  // all: the section named in capitals over a card's title.
  textMuted: { smallest: 'kicker', grounds: ['background', 'card', 'surface'] },
  // The wire, the pill of a button, the mark on a column, the masthead of a cover: all the paper's own red.
  onPrimary: { smallest: 'caption', grounds: ['primary'] },
  // An article's own title, on the page it is read on. It stood on a second ground as well — the torn paper of a
  // callout, which set its own title in the same type — and a call for support is not a headline.
  headline: { smallest: 'headline', grounds: ['background'] },
  // The paper's own name, in the bar across the top of the front page and in no other type. Its size is the reason
  // it may be printed in this red at all: a step under twenty-four would put it under a bar it cannot clear.
  mark: { smallest: 'masthead', grounds: ['background'] },
  // A word that answers a press lives inside prose, and takes the size of the paragraph around it.
  link: { smallest: 'prose', grounds: ['background'] },
} as const satisfies Readonly<Record<TextTone, Printing>>;

/**
 * The size, in points, at and above which WCAG 2 reads text as large. The guideline says eighteen points, or fourteen
 * bold, and notes that eighteen points is about twenty-four CSS pixels; React Native sets type in density-independent
 * points, which are those pixels. The bold half is left out deliberately: reading every face as if it were light is
 * the stricter reading, it asks for no second table saying what a face weighs, and it changes no verdict here — the
 * one variant that clears twenty-four clears it at any weight.
 */
const LARGE_TEXT = 24;

/** What WCAG AA asks of large text, and of everything else. */
const AA_LARGE = 3;
const AA_NORMAL = 4.5;

/** The contrast a run of text at this size owes the ground under it. */
export const requiredRatio = (size: number): number => (size >= LARGE_TEXT ? AA_LARGE : AA_NORMAL);

/** What WCAG 1.4.11 asks of the parts of a control that say where it is and which state it is in. */
export const SHAPE_RATIO = AA_LARGE;

/** Two roles that touch, and which a reader has to tell apart to use the control they draw. */
type Adjacency = Readonly<{ part: keyof Theme; against: keyof Theme; says: string }>;

/**
 * The adjacencies of the app's one drawn control, the switch of the reading settings.
 *
 * A control is not a word, and the bar is not the same one: three to one, of everything that says where the control
 * is and which way it is set. It is listed rather than inferred because the platform draws the control and only this
 * file knows which of its parts take which role — and because the last line below is the one that was missing. The
 * knob had the page's own colour; the platform paints it wider than the track, so where it sat there was a hole and
 * where it did not there was a crescent. Nothing said so: every other pair held.
 */
export const SHAPES = [
  { part: 'control', against: 'background', says: 'where the switch is, set off' },
  { part: 'primary', against: 'background', says: 'where the switch is, set on' },
  { part: 'textPrimary', against: 'control', says: 'which side the knob rests on, set off' },
  { part: 'textPrimary', against: 'primary', says: 'which side the knob rests on, set on' },
  { part: 'textPrimary', against: 'background', says: 'that the knob is a knob, and not a hole in the page' },
] as const satisfies readonly Adjacency[];

/** A pairing the paper prints knowing it is under the bar, with the reading that says how far under. */
type Departure = Readonly<{
  tone: TextTone;
  ground: Ground;
  /** The ratio measured today. A departure carries its own floor, so the pairing can never quietly get worse. */
  floor: number;
  because: string;
}>;

/**
 * Where the paper knowingly prints under the bar.
 *
 * A departure is not an exemption: it is a measurement with a reason attached, and it is held from both sides — the
 * pairing may not fall below the floor written here, and it may not rise above the bar either, because a departure
 * that has stopped being one is a line of prose claiming something untrue about the paper.
 */
export const DEPARTURES = [
  {
    tone: 'onPrimary',
    ground: 'primary',
    floor: 3.83,
    because:
      'the red is the paper, measured on the current app, and nothing is lighter than the white laid on it: meeting the bar would mean no longer printing in the colour the masthead is printed in',
  },
] as const satisfies readonly Departure[];
