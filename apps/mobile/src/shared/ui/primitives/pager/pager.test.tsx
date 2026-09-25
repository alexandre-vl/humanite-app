import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, View } from 'react-native';
import { scrollViewAbove, styleOf } from '../../../lib/testing';
import type { Rendered } from '../../../lib/testing';
import type { NamePlace } from './geometry';
import { Pager } from './pager';

/** The width one page takes, which is the screen's: the offset a swipe lands on is a multiple of it. */
const WIDTH = Dimensions.get('window').width;

const COUNT = 5;

/** Two names of different widths, as a row would have measured them. */
const PLACES: readonly NamePlace[] = [
  { x: 0, width: 100 },
  { x: 100, width: 60 },
];

const NAMES = (
  <>
    <View testID="nom-0" />
    <View testID="nom-1" />
  </>
);

/** The scrolling region the pages sit in, climbed to from a page that is built: the pager marks nothing for a test. */
const across = (from: number): Rendered =>
  scrollViewAbove(
    screen.getByTestId(`page-${String(from)}`),
    'le pager ne tient aucune région défilante : le test ne vérifierait rien',
  );

/** The scrolling region the names sit in, which is the band. */
const band = (): Rendered =>
  scrollViewAbove(screen.getByTestId('nom-0'), 'la bande ne défile pas : le test ne vérifierait rien');

/** Everything drawn inside a node, however deep, the words themselves left out. */
const under = (node: Rendered): readonly Rendered[] =>
  node.children.flatMap((child) => (typeof child === 'string' ? [] : [child, ...under(child)]));

/**
 * The rule: the one thing inside the band laid over the row rather than in it. It carries no name of its own — a rule
 * says nothing to a reader who cannot see it, and the row already announces which choice is in force — so it is found
 * by what it is, and the failure says so rather than reading a style off whatever happened to be there.
 */
const rule = (): Rendered => {
  const laid = under(band()).filter((node) => styleOf(node)['position'] === 'absolute');
  const found = laid[0];
  if (laid.length !== 1 || found === undefined) {
    throw new Error(`la bande pose ${String(laid.length)} vues par-dessus sa rangée : la règle n’est plus la seule`);
  }
  return found;
};

/** The transforms a node is painted with, in the order React Native applies them. */
const transformsOf = (node: Rendered): unknown => styleOf(node)['transform'];

const swipeTo = async (index: number, from: number): Promise<void> => {
  await fireEvent(across(from), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: WIDTH * index } } });
};

const shown = (): readonly number[] =>
  Array.from({ length: COUNT }, (unused, index) => index).filter(
    (index) => screen.queryByTestId(`page-${String(index)}`) !== null,
  );

const page = (index: number): ReactNode => <View testID={`page-${String(index)}`} />;

describe('Pager', () => {
  it('ne construit que la page lue et ses deux voisines, et pose les autres quand même', async () => {
    await render(<Pager count={COUNT} active={2} onActive={jest.fn()} renderPage={page} />);
    // That the pages left out are still laid out, at the width of the screen, is not held here: a headless runner
    // measures nothing, so a cell of zero width and a cell of a screen's width render the same tree. What is held is
    // that they hold nothing — which is the whole of what building near the reader buys.
    expect(shown()).toEqual([1, 2, 3]);
  });

  /**
   * A page is built once and kept. Taking down the page a reader has just turned away from is what made every turn
   * cost a build — measured on the A065 on 25/09/2026, 70 ms of frozen screen on a turn forward against 25 on a turn
   * back to a page still standing — and it is also what lost the reader their place in the section they came from.
   */
  it('garde les pages qu’il a construites, et en construit d’autres autour de celle qu’on lui désigne', async () => {
    const view = await render(<Pager count={COUNT} active={0} onActive={jest.fn()} renderPage={page} />);
    expect(shown()).toEqual([0, 1]);
    await view.rerender(<Pager count={COUNT} active={4} onActive={jest.fn()} renderPage={page} />);
    expect(shown()).toEqual([0, 1, 3, 4]);
  });

  it('rapporte la page où un balayage s’est arrêté', async () => {
    const landed = jest.fn();
    await render(<Pager count={COUNT} active={0} onActive={landed} renderPage={page} />);
    await swipeTo(3, 0);
    expect(landed).toHaveBeenCalledWith(3);
  });

  it('pose les noms qu’on lui donne dans une bande qui défile en travers', async () => {
    await render(<Pager count={COUNT} active={0} onActive={jest.fn()} renderPage={page} names={NAMES} />);
    expect(styleOf(band())['flexGrow']).toBe(0);
  });

  /**
   * La règle est étirée, jamais redimensionnée. Une largeur est une propriété de mise en page, et une largeur qui
   * change à chaque image repasse toute la bande par Yoga : mesuré sur l’A065 le 25/09/2026, un tour tombait de 90
   * images à 20, l’écran gardant chaque image 45 ms.
   */
  it('pose la règle sous le nom de la page en cours, à sa largeur, par transformation seule', async () => {
    await render(
      <Pager count={COUNT} active={0} onActive={jest.fn()} renderPage={page} names={NAMES} places={PLACES} />,
    );
    // Laid two points wide and stretched fifty times to cover a name of a hundred, its middle carried to fifty.
    expect(transformsOf(rule())).toEqual([{ translateX: 49 }, { scaleX: 50 }]);
    expect(styleOf(rule())['width']).toBe(2);
  });

  it('emmène la règle sous le nom de la page qu’on lui désigne', async () => {
    await render(
      <Pager count={COUNT} active={1} onActive={jest.fn()} renderPage={page} names={NAMES} places={PLACES} />,
    );
    expect(transformsOf(rule())).toEqual([{ translateX: 129 }, { scaleX: 30 }]);
  });
});
