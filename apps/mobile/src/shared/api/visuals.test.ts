import { PICTURE } from '@huma/contracts';
import { ASSET_WIDTHS } from '@huma/mock-content/assets';
import { describe, expect, it } from '@jest/globals';
import { PLACE_WIDTHS, visualOf } from './visuals';

/**
 * The corpus writes a file per key and per width; the app asks for a width by naming a place. Neither list can see the
 * other: the generator runs on Node and knows no screen, and a screen knows no count of pixels. This is the only place
 * both are in scope, so it is the only place the pair can be held.
 *
 * It is held in both directions on purpose. A width written for no place ships files nobody can request — 63 of them,
 * 78 ko, weighed against a cold-start budget — and a place asking for a width nothing writes returns a broken picture.
 */
describe('les largeurs écrites et les places qui les demandent', () => {
  const rising = (left: number, right: number): number => left - right;
  const asked: readonly number[] = [...new Set<number>(Object.values(PLACE_WIDTHS))].sort(rising);
  const written: readonly number[] = [...ASSET_WIDTHS].sort(rising);

  it('ne laissent aucune largeur écrite sans place qui la demande', () => {
    expect(written.filter((width) => !asked.includes(width))).toEqual([]);
  });

  it('ne laissent aucune place demander une largeur que rien n’écrit', () => {
    expect(asked.filter((width) => !written.includes(width))).toEqual([]);
  });
});

/**
 * A picture of the journal is asked for at the width of the place it fills. The service lists each at a width of its
 * own — twelve hundred pixels, most of the time — and a thumbnail that kept it would download a picture four times as
 * wide as its box, on every row of every list.
 */
describe('une image du journal', () => {
  const url = 'https://www.humanite.fr/wp-content/uploads/2026/09/p4-duflot_MAR.jpg?w=150&h=150&crop=1';
  const picture = PICTURE.parse({ kind: 'journal', url });

  it('se demande à la largeur de chaque place, sans perdre ce que son adresse demande d’autre', () => {
    expect(visualOf(picture, 'thumbnail')).toEqual({ source: { uri: url.replace('w=150', 'w=320') } });
    expect(visualOf(picture, 'card')).toEqual({ source: { uri: url.replace('w=150', 'w=1080') } });
    expect(visualOf(picture, 'lead')).toEqual({ source: { uri: url.replace('w=150', 'w=1600') } });
  });

  it('ne porte aucun hachage à peindre, que le service n’envoie pas', () => {
    expect(visualOf(picture, 'card')?.thumbhash).toBeUndefined();
  });
});
