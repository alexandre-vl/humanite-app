import { z } from 'zod';
import type { Finding } from './finding.ts';
import { IMAGE_KEY } from './ids.ts';

/**
 * Where the journal keeps its pictures. Every picture of the 519 items of one capture was an address under this
 * prefix, and so was every picture set inside a body; the server answers each of them in WebP whatever the extension
 * says, and keeps it a year (`cache-control: public, max-age=31536000`).
 *
 * A picture pointing anywhere else is refused rather than fetched. The app asks a network for what an answer names,
 * and an answer is something it does not hold: a picture of the journal comes from the journal, and nothing that
 * says otherwise is a picture of the journal.
 */
const UPLOADS = 'https://www.humanite.fr/wp-content/uploads/';

/**
 * Where the picture of an item comes from: a key of the corpus, whose files the bundler resolves at build time, or an
 * address on the journal's own server, which the phone asks for.
 *
 * Two sources and not one, because the two are resolved in two different ways and neither can pass for the other: a
 * key the bundler never saw names nothing, and an address is not a file inside the app. The union makes a reader of
 * a picture say which one it holds before it does anything with it.
 */
export const PICTURE = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('corpus'), key: IMAGE_KEY }),
  z.object({ kind: z.literal('journal'), url: z.url().startsWith(UPLOADS) }),
]);
export type Picture = z.infer<typeof PICTURE>;

/** The parameter the journal's server reads a width from, with what precedes it: the start of a query, or another one. */
const WIDTH = /([?&])w=\d+/u;

/**
 * The same picture of the journal, asked for at a width.
 *
 * The service lists every picture at a width of its own choosing — twelve hundred pixels, four hundred and thirty-three
 * times out of five hundred and nineteen — and its server scales it down to any width it is asked, never up. A
 * thumbnail three hundred and twenty pixels wide that took the address as listed would download a picture nearly four
 * times as wide as its box, on every row of every list. So the width is replaced, and nothing else is touched: a
 * picture set inside a body carries a height and a crop beside its width, and losing them would hand back a different
 * picture.
 */
export const atWidth = (address: string, width: number): string =>
  WIDTH.test(address)
    ? address.replace(WIDTH, (whole, lead: string) => `${lead}w=${String(width)}`)
    : `${address}${address.includes('?') ? '&' : '?'}w=${String(width)}`;

/** The name of one thing a way of asking for a picture can get wrong. */
export type PictureCode = 'picture/width-ignored' | 'picture/address-changed' | 'picture/query-lost';

/** A way of asking for a picture at a width, which is what the judging below is handed rather than reaching for one. */
export type Resize = (address: string, width: number) => string;

/** A picture as the service lists it: the one parameter of its address is the width the service chose. */
const LISTED = `${UPLOADS}2026/05/p16-CLimat_MER.jpg?w=1200`;

/** A picture as a body sets it: a width, and a height and a crop that asking for another width must not cost. */
const CROPPED = `${UPLOADS}2026/09/p4-duflot_MAR.jpg?w=150&h=150&crop=1`;

/** A width neither sample already asks for, so a way of asking that leaves an address alone cannot pass by chance. */
const WANTED = 320;

/** The width an address asks for, or nothing when it asks for none. */
const widthOf = (address: string): number | null => {
  const found = /[?&]w=(\d+)/u.exec(address)?.[1];
  return found === undefined ? null : Number(found);
};

/** Everything an address names before its query: which picture, on which server. */
const placeOf = (address: string): string => address.split('?')[0] ?? address;

/** The parameters of an address other than its width, each as it is written. */
const othersOf = (address: string): readonly string[] =>
  (address.split('?')[1] ?? '').split('&').filter((pair) => pair !== '' && !pair.startsWith('w='));

/**
 * Whether a way of asking for a picture asks for the width of the place it fills, and for that picture and no other.
 *
 * The way is handed in rather than reached for, so a fixture can hand in one that leaves the width as the service
 * listed it, or sends the address somewhere else, or drops what else the address says — and read the code that comes
 * back. Both samples are shapes the journal's own server was seen answering.
 */
export const judgePicture = (resize: Resize): readonly Finding<PictureCode>[] => {
  const asked = [LISTED, CROPPED].map((address) => ({ address, answer: resize(address, WANTED) }));
  const any = (test: (pair: Readonly<{ address: string; answer: string }>) => boolean): boolean => asked.some(test);
  return [
    ...(any(({ answer }) => widthOf(answer) !== WANTED)
      ? [{ code: 'picture/width-ignored' as const, says: `une image demandée à ${String(WANTED)} pixels ne l’est pas` }]
      : []),
    ...(any(({ address, answer }) => placeOf(answer) !== placeOf(address))
      ? [{ code: 'picture/address-changed' as const, says: 'l’adresse d’une image ne désigne plus la même image' }]
      : []),
    ...(any(({ address, answer }) => othersOf(address).some((pair) => !othersOf(answer).includes(pair)))
      ? [
          {
            code: 'picture/query-lost' as const,
            says: 'une image a perdu la hauteur ou le recadrage que son adresse demandait',
          },
        ]
      : []),
  ];
};
