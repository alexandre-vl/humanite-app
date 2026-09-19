import type { DisplayText } from '@huma/contracts';
import { asDisplayText } from '../lib/display-text';
import { FR } from './fr';

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
