import { atWidth, judgePicture } from '@huma/contracts';
import type { PictureCode, Resize } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';

const define = fixtureFactory<PictureCode>();

/**
 * Ways of asking the journal's server for a picture, each with one thing done wrong, judged by the journal's own
 * judging.
 *
 * The judging is real and the ways of asking are not, for the reason given everywhere on this bench: handed the real
 * one, a judging can only say it is in order, and the package's own test already says that. Each broken way here is
 * one a hurried change could plausibly write — leave the address as the service listed it, route it through a
 * resizing proxy, rebuild the query from the width alone — and each is caught by exactly one code.
 */
const judged = (resize: Resize) => async (): Promise<readonly PictureCode[]> =>
  Promise.resolve(judgePicture(resize).map((finding) => finding.code));

/** Everything an address says before its query, which is what a rebuilt query keeps and nothing else. */
const placeOf = (address: string): string => address.split('?')[0] ?? address;

export const PICTURE_FIXTURES = [
  define('picture/resizer', 'la façon dont l’app demande une image, à la largeur de sa place', [], judged(atWidth)),
  define(
    'picture/width-ignored',
    'une demande qui garde la largeur que le service a choisie, quelle que soit la place',
    ['picture/width-ignored'],
    judged((address) => address),
  ),
  define(
    'picture/address-changed',
    'une demande qui fait passer l’image par un proxy de redimensionnement',
    ['picture/address-changed'],
    judged((address, width) => atWidth(address, width).replace('://www.', '://i0.wp.com/www.')),
  ),
  define(
    'picture/query-lost',
    'une demande qui refait la requête avec la seule largeur, et perd hauteur et recadrage',
    ['picture/query-lost'],
    judged((address, width) => `${placeOf(address)}?w=${String(width)}`),
  ),
] as const;
