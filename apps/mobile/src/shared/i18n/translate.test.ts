import { describe, expect, it } from '@jest/globals';
import { t } from './translate';

describe('t', () => {
  it('rend le texte d’une clé sans trou, tel qu’il est écrit', () => {
    expect(t('nav.search')).toBe('Recherche');
  });

  it('remplit chaque trou d’une clé par la valeur qu’on lui donne', () => {
    expect(t('search.count.many', { count: 12, query: 'climat' })).toBe('12 résultats pour « climat »');
  });

  it('écrit un nombre comme un nombre s’écrit, sans que l’appelant ait à le faire', () => {
    expect(t('search.count.one', { count: 1, query: 'gaza' })).toBe('1 résultat pour « gaza »');
  });

  /**
   * The guarantee this mechanism exists for, and the only one a test can state: each of these is a type error, so each
   * `@ts-expect-error` below is consumed by the compiler — an unused one fails the build just as loudly.
   */
  it('refuse à la compilation un trou vide, un trou en trop, et un nom mal écrit', () => {
    // @ts-expect-error une clé à trous n’est pas appelable sans ses valeurs
    expect(t('search.count.many')).toBeTruthy();
    // @ts-expect-error une clé sans trou n’accepte aucune valeur
    expect(t('nav.search', { count: 1 })).toBeTruthy();
    // @ts-expect-error le nom d’un trou est celui que le français écrit, et « subject » n’y est pas
    expect(t('search.none.title', { subject: 'climat' })).toBeTruthy();
    // @ts-expect-error il manque « query », que le texte laisse en blanc
    expect(t('search.count.many', { count: 3 })).toBeTruthy();
  });
});
