import { describe, expect, it } from '@jest/globals';
import { offsetOf, spanAt, travelOf } from './geometry';

/** Three names of different widths, laid one after the other the way a band lays them. */
const PLACES = [
  { x: 0, width: 100 },
  { x: 100, width: 60 },
  { x: 160, width: 200 },
] as const;

describe('spanAt', () => {
  it('donne le nom lui-même à un nombre entier', () => {
    expect(spanAt(PLACES, 0)).toEqual({ x: 0, width: 100 });
    expect(spanAt(PLACES, 1)).toEqual({ x: 100, width: 60 });
    expect(spanAt(PLACES, 2)).toEqual({ x: 160, width: 200 });
  });

  /** Ce qu’un doigt à mi-course regarde : entre les deux places, et déjà à la largeur d’entre les deux. */
  it('interpole la place et la largeur entre deux noms', () => {
    expect(spanAt(PLACES, 0.5)).toEqual({ x: 50, width: 80 });
    expect(spanAt(PLACES, 1.25)).toEqual({ x: 115, width: 95 });
  });

  /**
   * Un lecteur qui tire contre la première page ou la dernière emmène la rangée un peu plus loin qu’il n’y a de quoi
   * montrer ; une règle qui continuerait sortirait de dessous le seul nom qu’il y a.
   */
  it('se tient tranquille au-delà des deux bouts', () => {
    expect(spanAt(PLACES, -0.7)).toEqual({ x: 0, width: 100 });
    expect(spanAt(PLACES, 2.9)).toEqual({ x: 160, width: 200 });
  });

  /** Une bande qui n’a encore rien mesuré n’est nulle part, et sa règle n’a aucune largeur à montrer. */
  it('n’est nulle part tant que rien n’est mesuré', () => {
    expect(spanAt([], 1.5)).toEqual({ x: 0, width: 0 });
  });
});

describe('travelOf', () => {
  /**
   * La règle est étirée, jamais redimensionnée : une largeur est une propriété de mise en page, et une largeur qui
   * change repasse toute la bande par Yoga à chaque image. Mesuré sur l’A065 le 25/09/2026, une règle qui s’élargissait
   * ainsi faisait tomber un tour de 90 images à 20, l’écran gardant chaque image 45 ms.
   */
  it('étire la règle à la largeur voulue et vise son milieu', () => {
    expect(travelOf({ x: 100, width: 60 }, 2)).toEqual({ translateX: 129, scaleX: 30 });
  });

  it('ramène la règle au début quand rien n’est mesuré', () => {
    expect(travelOf({ x: 0, width: 0 }, 2)).toEqual({ translateX: -1, scaleX: 0 });
  });

  /** Une règle posée sans largeur ne s’étire pas : la diviser par sa largeur ne donnerait aucun nombre. */
  it('ne s’étire pas quand elle n’est posée sur aucune largeur', () => {
    expect(travelOf({ x: 10, width: 40 }, 0)).toEqual({ translateX: 30, scaleX: 0 });
  });
});

describe('offsetOf', () => {
  it('garde devant le nom en vigueur ce qu’on lui demande d’en garder', () => {
    expect(offsetOf({ x: 300, width: 60 }, 48)).toBe(252);
  });

  /** Le début de la bande n’a rien devant lui à montrer. */
  it('ne va jamais avant le début', () => {
    expect(offsetOf({ x: 20, width: 100 }, 48)).toBe(0);
  });
});
