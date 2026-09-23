import { contrastRatio } from './contrast.ts';
import type { Theme } from './theme.ts';
import { THEMES } from './theme.ts';
import type { TextTone, TextVariant } from './typography.ts';
import { TEXT_SCALES, TEXT_TONES, typographyAt } from './typography.ts';

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
 * reader can choose. Of the twelve variants exactly two are large text by WCAG's measure — an article's own headline
 * and the paper's masthead, the two roles set at twenty-eight points. Every other role owes four and a half to one,
 * and six of them were being held to three.
 */

/** The roles a screen paints behind text. */
const GROUNDS = ['background', 'ground', 'surface', 'card', 'primary'] as const satisfies readonly (keyof Theme)[];

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
const PRINTINGS = {
  // The page a feed and an article are printed on, the torn paper a linked card is dropped on, the sheet a group of
  // rows is laid on, and the bar a row of labels sits in. Smallest in a picture's legend, and in the word that marks
  // what an item is or that anyone may read it.
  textPrimary: { smallest: 'legend', grounds: ['background', 'ground', 'surface', 'card'] },
  // What answers a title on a card.
  textSecondary: { smallest: 'summary', grounds: ['background'] },
  // The count under a cover, the hint under a row of settings, the signature of a column, the credit under a picture,
  // and the smallest of them all: the name set in capitals over a linked article.
  textMuted: { smallest: 'kicker', grounds: ['background', 'card', 'surface'] },
  // The day heads of the wire, the pill of a button, the chosen step of a setting, the play mark of a film, the
  // masthead of a cover: all the paper's own red.
  onPrimary: { smallest: 'caption', grounds: ['primary'] },
  // An article's own title, on the page it is read on. It stood on a second ground as well — the torn paper of a
  // callout, which set its own title in the same type — and a call for support is not a headline.
  headline: { smallest: 'headline', grounds: ['background'] },
  // The paper's own name, in the bar across the top of the front page and in no other type. Its size is the reason
  // it may be printed in this red at all: a step under twenty-four would put it under a bar it cannot clear.
  mark: { smallest: 'masthead', grounds: ['background'] },
  // A word that answers a press lives inside prose, and takes the size of the paragraph around it. The tab a reader is
  // on is named in it too, on the ground of the bar at the bottom; the platform sets that word at its own size, which
  // no variant names, and under twenty-four points every size owes the same.
  link: { smallest: 'prose', grounds: ['background', 'surface'] },
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
const SHAPE_RATIO = AA_LARGE;

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
const SHAPES = [
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
const DEPARTURES = [
  {
    tone: 'onPrimary',
    ground: 'primary',
    floor: 3.83,
    because:
      'the red is the paper, measured on the current app, and nothing is lighter than the white laid on it: meeting the bar would mean no longer printing in the colour the masthead is printed in',
  },
] as const satisfies readonly Departure[];

/**
 * The name of one thing a reading of the paper's own colours can find wrong, one per thing that can be untrue, so a
 * rule is proven by a fixture that makes exactly its code appear rather than by a test nobody can point at.
 *
 * It is written as a union rather than read off a list, nothing ever walking the codes: a reading names exactly one,
 * and a fixture names the set it expects. A list would be a second place for a code to exist.
 */
export type LegibilityCode =
  | 'legibility/under-bar'
  | 'legibility/departure-worse'
  | 'legibility/departure-obsolete'
  | 'legibility/departure-unprinted'
  | 'legibility/shape-under-bar'
  | 'legibility/ground-unprinted';

/** One thing a reading found wrong, and the measurement that says so. */
export type LegibilityFinding = Readonly<{ code: LegibilityCode; says: string }>;

/**
 * The tables a reading judges.
 *
 * They are handed in rather than read from this module, and that is the whole of what makes the rule provable: a
 * reading that reached for the paper's own tables could only ever answer about the paper, so nothing could show that
 * it answers at all. Given the tables, a fixture hands it a broken one and reads the code that comes back — and the
 * paper's own, `THE_PAPER` below, is what the package's test hands it to say the paper is in order.
 */
export type LegibilityTables = Readonly<{
  themes: Readonly<Record<string, Theme>>;
  printings: Readonly<Record<TextTone, Printing>>;
  departures: readonly Departure[];
  shapes: readonly Adjacency[];
  grounds: readonly Ground[];
  /** The size a variant is set at, at the smallest step a reader can choose, which is the step that asks the most. */
  sizeOf: (variant: TextVariant) => number;
}>;

const ratioAt = (value: number): string => value.toFixed(2);

/** Every pairing of text and ground the printings name, theme by theme, judged against the bar its size owes. */
const readPrintings = (tables: LegibilityTables): readonly LegibilityFinding[] =>
  Object.entries(tables.themes).flatMap(([name, theme]) =>
    TEXT_TONES.flatMap((tone) => {
      const printing = tables.printings[tone];
      const required = requiredRatio(tables.sizeOf(printing.smallest));
      return printing.grounds.flatMap((ground): readonly LegibilityFinding[] => {
        const ratio = contrastRatio(theme[tone], theme[ground]);
        const where = `${name} : ${tone} sur ${ground}, ${ratioAt(ratio)} pour ${ratioAt(required)} exigés`;
        const departure = tables.departures.find((entry) => entry.tone === tone && entry.ground === ground);
        if (departure === undefined) {
          return ratio >= required ? [] : [{ code: 'legibility/under-bar', says: where }];
        }
        if (ratio < departure.floor) {
          return [
            { code: 'legibility/departure-worse', says: `${where}, sous le plancher ${ratioAt(departure.floor)}` },
          ];
        }
        return ratio < required ? [] : [{ code: 'legibility/departure-obsolete', says: where }];
      });
    }),
  );

/** A departure excusing a pairing no screen prints excuses nothing, and would sit there saying it did. */
const readDepartures = (tables: LegibilityTables): readonly LegibilityFinding[] =>
  tables.departures.flatMap((departure) =>
    tables.printings[departure.tone].grounds.includes(departure.ground)
      ? []
      : [
          {
            code: 'legibility/departure-unprinted' as const,
            says: `${departure.tone} n’est pas posé sur ${departure.ground}`,
          },
        ],
  );

/** Each part of the paper's one drawn control, against what it touches. */
const readShapes = (tables: LegibilityTables): readonly LegibilityFinding[] =>
  Object.entries(tables.themes).flatMap(([name, theme]) =>
    tables.shapes.flatMap((shape): readonly LegibilityFinding[] => {
      const ratio = contrastRatio(theme[shape.part], theme[shape.against]);
      return ratio >= SHAPE_RATIO
        ? []
        : [
            {
              code: 'legibility/shape-under-bar' as const,
              says: `${name} : ${shape.says}, ${ratioAt(ratio)} pour ${ratioAt(SHAPE_RATIO)} exigés`,
            },
          ];
    }),
  );

/** A ground the rule names that nothing is printed on is a ground it would keep asking about for nothing. */
const readGrounds = (tables: LegibilityTables): readonly LegibilityFinding[] => {
  const printed = new Set(Object.values(tables.printings).flatMap((printing) => printing.grounds));
  return tables.grounds.flatMap((ground) =>
    printed.has(ground)
      ? []
      : [{ code: 'legibility/ground-unprinted' as const, says: `rien n’est posé sur ${ground}` }],
  );
};

/** Everything a reading of `tables` finds wrong, in the order the rules are written. */
export const judgeLegibility = (tables: LegibilityTables): readonly LegibilityFinding[] => [
  ...readPrintings(tables),
  ...readDepartures(tables),
  ...readShapes(tables),
  ...readGrounds(tables),
];

/**
 * The paper's own tables. The size is read at the smallest step a reader can choose and in the paper's own faces: a
 * face set has no say in a size — a step multiplies the role's own — so either set answers for both.
 */
export const THE_PAPER: LegibilityTables = {
  themes: THEMES,
  printings: PRINTINGS,
  departures: DEPARTURES,
  shapes: SHAPES,
  grounds: GROUNDS,
  sizeOf: (variant) => typographyAt(variant, TEXT_SCALES[0], 'paper').size,
};
