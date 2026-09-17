import { z } from 'zod';

/** Text sanctioned for display: it comes from the dictionary, a formatter, or validated content, never a raw literal. */
export const DISPLAY_TEXT = z.string().brand('DisplayText');
/** A string a native Text may render: the output of `t()`, of a formatter, or of a contract's prose field. */
export type DisplayText = z.infer<typeof DISPLAY_TEXT>;
