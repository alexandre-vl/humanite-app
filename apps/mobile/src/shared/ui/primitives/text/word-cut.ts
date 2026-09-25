/** A line as the platform reports it once it has laid a text out. */
type Line = Readonly<{ text: string }>;

/** Where a line may end without cutting a word: after a space, a hyphen, or a soft hyphen. */
const WORD_END = /[\s\u00AD-]$/u;

/**
 * Whether the platform cut a word to fit the lines it was given: some line but the last stops inside a word.
 *
 * A line broken where the words allow ends on the space between them — « Très » over « grand » is reported as
 * « Très » and a space, then « grand ». A word too wide for its line leaves no such place to break, and the platform
 * breaks it where the room runs out: at the phone's largest text size, on the iPhone simulator on 25/09/2026, a choice
 * of the reading settings read « Syst » over « ème ».
 */
export const cutsAWord = (lines: readonly Line[]): boolean =>
  lines.slice(0, -1).some((line) => !WORD_END.test(line.text));
