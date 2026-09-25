/**
 * The text sizes a phone offers every app, smallest first, named as iOS names them: seven for every reader, and five
 * more, the accessibility sizes, for readers who need larger type still.
 */
export const TEXT_SIZE_CATEGORIES = [
  'xSmall',
  'small',
  'medium',
  'large',
  'xLarge',
  'xxLarge',
  'xxxLarge',
  'ax1',
  'ax2',
  'ax3',
  'ax4',
  'ax5',
] as const;

/** The name of one of iOS's text sizes. */
export type TextSizeCategory = (typeof TEXT_SIZE_CATEGORIES)[number];

/**
 * The text size a reader set on their phone for every app, as the system that set it grows a size.
 *
 * iOS names one of its sizes and grows each of its text styles by a table of its own. Android multiplies by a scale,
 * and from Android 14 bends the multiple so that large type grows less than small. Anything else multiplies, and one
 * that multiplies by one is a phone nobody has touched.
 */
export type PhoneText =
  | Readonly<{ system: 'ios'; category: TextSizeCategory }>
  | Readonly<{ system: 'android'; scale: number }>
  | Readonly<{ system: 'linear'; scale: number }>;

/** A phone whose text size is where it came: every size prints as the paper sets it. */
export const UNMOVED_PHONE: PhoneText = { system: 'linear', scale: 1 };

/** A size before and after the phone grows it, in points. */
type Step = readonly [from: number, to: number];

/**
 * What iOS sets its text styles at: the size each style has at the default text size, `large`, then the size it has
 * at each of the twelve, in the order above. Read from the system and not from a document —
 * `UIFont.preferredFont(forTextStyle:compatibleWith:)` on the iPhone simulator, iOS 27, 25/09/2026 — so the paper
 * grows its type the way the phone grows the text around it. `headline` measures what `body` measures, and is not
 * written twice.
 *
 * The table is why a size is not multiplied. iOS grows small type most and large type least: at the largest size,
 * body text goes from 17 points to 53 and a large title from 34 to 60, so the two stay a line of text and a heading.
 * Multiplied by the one factor the platform reports, the paper's headline went from 28 points to 100 and set four
 * words to a screen, where the phone's own titles beside it stood at 58.
 */
const DYNAMIC_TYPE: readonly Readonly<{ at: number; sizes: readonly number[] }>[] = [
  { at: 11, sizes: [11, 11, 11, 11, 13, 15, 17, 20, 24, 29, 34, 40] }, // caption 2
  { at: 12, sizes: [11, 11, 11, 12, 14, 16, 18, 22, 26, 32, 37, 43] }, // caption 1
  { at: 13, sizes: [12, 12, 12, 13, 15, 17, 19, 23, 27, 33, 38, 44] }, // footnote
  { at: 15, sizes: [12, 13, 14, 15, 17, 19, 21, 25, 30, 36, 42, 49] }, // subheadline
  { at: 16, sizes: [13, 14, 15, 16, 18, 20, 22, 26, 32, 38, 44, 51] }, // callout
  { at: 17, sizes: [14, 15, 16, 17, 19, 21, 23, 28, 33, 40, 47, 53] }, // body
  { at: 20, sizes: [17, 18, 19, 20, 22, 24, 26, 31, 37, 43, 49, 55] }, // title 3
  { at: 22, sizes: [19, 20, 21, 22, 24, 26, 28, 34, 39, 44, 50, 56] }, // title 2
  { at: 28, sizes: [25, 26, 27, 28, 30, 32, 34, 38, 43, 48, 53, 58] }, // title 1
  { at: 34, sizes: [31, 32, 33, 34, 36, 38, 40, 44, 48, 52, 56, 60] }, // large title
];

/** The sizes Android bends, in points: the same at every scale. */
const ANDROID_SIZES = [8, 10, 12, 14, 18, 20, 24, 30, 100] as const;

/**
 * What Android prints each of those sizes at, at each scale it bends them at: `FontScaleConverterFactory`, in the
 * Android Open Source Project (Apache License 2.0), from Android 14. A scale between two of them reads each size
 * between the two tables, in proportion; a scale under the first or over the last is multiplied, as Android does.
 * Each is written at the scale Android writes it at, and found where Android files it.
 */
const ANDROID_CURVES: readonly Readonly<{ scale: number; sizes: readonly number[] }>[] = [
  { scale: 1.05, sizes: [8.4, 10.5, 12.6, 14.8, 18.6, 20.6, 24.4, 30, 100] },
  { scale: 1.1, sizes: [8.8, 11, 13.2, 15.6, 19.2, 21.2, 24.8, 30, 100] },
  { scale: 1.15, sizes: [9.2, 11.5, 13.8, 16.4, 19.8, 21.8, 25.2, 30, 100] },
  { scale: 1.2, sizes: [9.6, 12, 14.4, 17.2, 20.4, 22.4, 25.6, 30, 100] },
  { scale: 1.3, sizes: [10.4, 13, 15.6, 18.8, 21.6, 23.6, 26.4, 30, 100] },
  { scale: 1.5, sizes: [12, 15, 18, 22, 24, 26, 28, 30, 100] },
  { scale: 1.8, sizes: [14.4, 18, 21.6, 24.4, 27.6, 30.8, 32.8, 34.8, 100] },
  { scale: 2, sizes: [16, 20, 24, 26, 30, 34, 36, 38, 100] },
];

/**
 * Where Android files the table of a scale, and so where it looks one up (`getKey`): the hundredths of the scale as
 * the phone holds it, a 32-bit float, multiplied as one and cut rather than rounded. React Native hands over that
 * same float, and a scale of 1.15 arrives as 1.149999976 and is filed at 115. The table written for 1.05 is filed at
 * 104, though, which is why Android bends a scale of 1.04 already, and why a scale between two tables is placed
 * between the scales their places stand for rather than the ones they were written for.
 */
const placeOf = (scale: number): number => Math.trunc(Math.fround(Math.fround(scale) * 100));

/**
 * Where a size lands on a table of steps: straight between the two around it, and in proportion to the first below it.
 * Past the last step the two systems part: iOS is read as going on the way its last two styles go, which is the
 * nearest thing it says about a size it has no style for; Android multiplies by what its last step multiplies by.
 */
const along = (steps: readonly Step[], size: number, past: 'slope' | 'ratio'): number => {
  let before: Step = [0, 0];
  let below: Step = [0, 0];
  for (const step of steps) {
    if (size <= step[0]) {
      return below[1] + ((size - below[0]) * (step[1] - below[1])) / (step[0] - below[0]);
    }
    before = below;
    below = step;
  }
  return past === 'ratio'
    ? (size * below[1]) / below[0]
    : below[1] + ((size - below[0]) * (below[1] - before[1])) / (below[0] - before[0]);
};

/** iOS's steps at one of its sizes: each style's size at the default, and what the category makes of it. */
const iosSteps = (category: TextSizeCategory): readonly Step[] => {
  const column = TEXT_SIZE_CATEGORIES.indexOf(category);
  return DYNAMIC_TYPE.map(({ at, sizes }): Step => [at, sizes[column] ?? at]);
};

/**
 * Android's steps at a scale, or nothing where Android multiplies instead of bending: under its first table, and past
 * its last. A scale filed where a table is reads that table; one filed between two reads each size between them.
 */
const androidSteps = (scale: number): readonly Step[] | null => {
  const place = placeOf(scale);
  const lower = ANDROID_CURVES.findLast((curve) => placeOf(curve.scale) <= place);
  const upper = ANDROID_CURVES.find((curve) => placeOf(curve.scale) > place);
  if (lower === undefined || (upper === undefined && placeOf(lower.scale) !== place)) {
    return null;
  }
  const start = placeOf(lower.scale) / 100;
  const share =
    upper === undefined || placeOf(lower.scale) === place
      ? 0
      : Math.min(1, Math.max(0, (scale - start) / (placeOf(upper.scale) / 100 - start)));
  return ANDROID_SIZES.map((size, index): Step => {
    const from = lower.sizes[index] ?? size;
    const to = upper?.sizes[index] ?? from;
    return [size, from + (to - from) * share];
  });
};

/**
 * The size a phone prints a size at, given the text size its reader set: the way the phone's own system grows it, so
 * the paper's type moves in step with every other app's.
 */
export const phoneSize = (size: number, phone: PhoneText): number => {
  switch (phone.system) {
    case 'ios':
      return along(iosSteps(phone.category), size, 'slope');
    case 'android': {
      const steps = androidSteps(phone.scale);
      return steps === null ? size * phone.scale : along(steps, size, 'ratio');
    }
    case 'linear':
      return size * phone.scale;
  }
};
