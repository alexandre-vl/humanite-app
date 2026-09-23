import type { ArticleFormat, DisplayText } from '@huma/contracts';
import { t } from '#i18n';

/** The words a format is announced by, as the dictionary keys them. */
type FormatWord = 'format.column' | 'format.live' | 'format.series' | 'format.video';

/** What a format changes on a screen: the word over a title, the signed card of a column, the dark page of a video. */
type Treatment = Readonly<{ word: FormatWord | null; column: boolean; dark: boolean }>;

/**
 * What each format of the paper changes on a screen, format by format, and nowhere else.
 *
 * The word over a title is what the service knows of every item, and the one thing that sets an item apart before it
 * is opened. The section an item ran in would be another, and is known of no item outside that section's own list: a
 * word printed over the items of one list and over nothing else teaches a reader nothing. So a card, a row of the wire
 * and the head of an article each print this word and only this one — and an article, which most items are, none.
 *
 * The table answers for every format the contract declares, so a format added there stops the build here rather than
 * being drawn, silently, as a plain article.
 */
const TREATMENTS = {
  article: { word: null, column: false, dark: false },
  column: { word: 'format.column', column: true, dark: false },
  video: { word: 'format.video', column: false, dark: true },
  series: { word: 'format.series', column: false, dark: false },
  live: { word: 'format.live', column: false, dark: false },
} as const satisfies Readonly<Record<ArticleFormat, Treatment>>;

/** The word an item's format is announced by over its title, or none for a plain article. */
export const formatWord = (format: ArticleFormat): DisplayText | null => {
  const { word } = TREATMENTS[format];
  return word === null ? null : t(word);
};

/** Whether an item is a column: signed, and set apart by the rule a quoted voice is set apart by. */
export const isColumn = (format: ArticleFormat): boolean => TREATMENTS[format].column;

/** Whether an item is read on the dark page whatever the reader's theme, as the paper prints its videos. */
export const readsDark = (format: ArticleFormat): boolean => TREATMENTS[format].dark;
