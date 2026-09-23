import { z } from 'zod';

/**
 * Text sanctioned for display: it comes from the dictionary, a formatter, or validated content, never a raw literal.
 *
 * It is never empty. A field with nothing in it is a field the item does not carry, and says so by being absent: an
 * empty string was once how an item said it had no standfirst, and a screen had to know to test for it before drawing
 * an empty line. A text may still be blank — the space that keeps two runs of a sentence apart is one — so what is
 * refused is only the text that holds nothing at all.
 */
export const DISPLAY_TEXT = z.string().min(1).brand('DisplayText');
/** A string a native Text may render: the output of `t()`, of a formatter, or of a contract's prose field. */
export type DisplayText = z.infer<typeof DISPLAY_TEXT>;
