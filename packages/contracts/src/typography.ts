/**
 * French typography, as every text that reaches a screen keeps it: the journal's, read from its service; the
 * corpus's, read from its files; and the app's own words, which a test holds to the same rule.
 */

/**
 * The space French sets where a line must not break. Written as an escape, wherever this repository writes it, so the
 * source carries no byte a reader of it cannot see.
 */
export const UNBREAKABLE = '\u00A0';

/**
 * Some text set the way French sets it, wherever it was set some other way.
 *
 * An unbreakable space before the high punctuation — the colon, the semicolon, the exclamation and question marks, the
 * closing guillemet and the per cent sign — and after the opening guillemet; the typographic apostrophe after a
 * letter; an initial held to the name that follows it.
 *
 * Only a blank already there is changed, never one added: French wants a space before a colon where English wants
 * none, and a title the journal wrote without one is the journal's to write. What this undoes is a blank that breaks
 * where the journal meant one that does not. Its service mixes the two — `U+0020` before the colon of one title and
 * `&nbsp;` before the colon of the next — and a line of a title could open on its own colon; a straight apostrophe
 * sat in the middle of a standfirst, « de l'Économie » a few words after « l’aide »; and « R. » ended a line of one
 * search result, its « Lefebvre » opening the next.
 */
export const typeset = (text: string): string =>
  text
    .replace(/ (?=[:;!?»%])/gu, UNBREAKABLE)
    .replace(/« /gu, `«${UNBREAKABLE}`)
    .replace(/(?<=\p{L})'/gu, '’')
    .replace(/(?<!\p{L})(\p{Lu}\.) (?=\p{Lu})/gu, `$1${UNBREAKABLE}`);
