/**
 * How short a question may be and still be one. Measured on the corpus: a single letter reaches all 72 articles and an
 * empty field reaches them too, the content having nothing to match against; two letters is where an answer starts
 * saying something. The contract asks for none, so the rule is the app's — written here once, read both by the query
 * that decides whether to ask and by the screen that decides whether to show an answer, so the two cannot disagree.
 */
const SHORTEST = 2;

/** Whether a text is a question worth putting to the content. */
export const searchable = (text: string): boolean => text.trim().length >= SHORTEST;
