import type { DisplayText } from '@huma/contracts';
import { asDisplayText } from '../lib/display-text';
import { FR } from './fr';
import { plural } from './plural';

/** A key of the French dictionary. */
type Key = keyof typeof FR;

/** The blanks a text leaves, read off the text itself: `{count} résultats pour « {query} »` leaves two. */
type Blanks<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}` ? Name | Blanks<Rest> : never;

/**
 * What a key must be given: nothing at all when its text leaves no blank, and one value per blank otherwise. A blank
 * left unfilled, a value with no blank to take it, and a misspelt name are each refused by the compiler — which is the
 * whole reason the blanks are read off the French rather than declared beside it, where the two could drift apart.
 */
type Fill<K extends Key> = [Blanks<(typeof FR)[K]>] extends [never]
  ? []
  : [Readonly<Record<Blanks<(typeof FR)[K]>, string | number>>];

/** The text with its blanks taken. Names are matched as written, so nothing here parses French. */
const fill = (text: string, values: Readonly<Record<string, string | number>>): string =>
  Object.entries(values).reduce((written, [name, value]) => written.split(`{${name}}`).join(String(value)), text);

/** The French text for a key, as a DisplayText a native Text may render, with the values its blanks take. */
export function t<K extends Key>(key: K, ...values: Fill<K>): DisplayText {
  const [given] = values;
  return asDisplayText(given === undefined ? FR[key] : fill(FR[key], given));
}

/** The stem of a pair of keys the dictionary writes a count into, one per form: `<stem>.one` and `<stem>.many`. */
type StemOf<K> = K extends `${infer Stem}.one` ? (`${Stem}.many` extends Key ? Stem : never) : never;

/**
 * A number of things in words: the form the count takes, with the count written into it by the dictionary. Which form
 * is the rule `plural` holds, so a place that counts names its pair of keys and nothing else; the stem is read off the
 * dictionary, and a stem missing either form is refused by the compiler.
 */
export function counted(stem: StemOf<Key>, count: number): DisplayText {
  return t(`${stem}.${plural(count)}`, { count });
}
