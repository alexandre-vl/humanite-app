import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { scrollViewAbove } from '../../../lib/testing';
import type { Rendered } from '../../../lib/testing';
import { Pager } from './pager';

/** The width one page takes, which is the screen's: the offset a swipe lands on is a multiple of it. */
const WIDTH = Dimensions.get('window').width;

const COUNT = 5;

/** The scrolling region the pager owns, climbed to from a page that is mounted: the pager marks nothing for a test. */
const across = (from: number): Rendered =>
  scrollViewAbove(
    screen.getByTestId(`page-${String(from)}`),
    'le pager ne tient aucune région défilante : le test ne vérifierait rien',
  );

const swipeTo = async (index: number, from: number): Promise<void> => {
  await fireEvent(across(from), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: WIDTH * index } } });
};

const shown = (): readonly number[] =>
  Array.from({ length: COUNT }, (unused, index) => index).filter(
    (index) => screen.queryByTestId(`page-${String(index)}`) !== null,
  );

describe('Pager', () => {
  it('ne monte que la page lue et ses deux voisines, et pose les autres quand même', async () => {
    await render(
      <Pager
        count={COUNT}
        active={2}
        onActive={jest.fn()}
        renderPage={(index) => <View testID={`page-${String(index)}`} />}
      />,
    );
    // That the pages left out are still laid out, at the width of the screen, is not held here: a headless runner
    // measures nothing, so a cell of zero width and a cell of a screen's width render the same tree. What is held is
    // that they hold nothing — which is the whole of what mounting near the reader buys.
    expect(shown()).toEqual([1, 2, 3]);
  });

  it('suit la page qu’on lui désigne, sans rien monter de plus', async () => {
    const view = await render(
      <Pager
        count={COUNT}
        active={0}
        onActive={jest.fn()}
        renderPage={(index) => <View testID={`page-${String(index)}`} />}
      />,
    );
    expect(shown()).toEqual([0, 1]);
    await view.rerender(
      <Pager
        count={COUNT}
        active={4}
        onActive={jest.fn()}
        renderPage={(index) => <View testID={`page-${String(index)}`} />}
      />,
    );
    expect(shown()).toEqual([3, 4]);
  });

  it('rapporte la page où un balayage s’est arrêté', async () => {
    const landed = jest.fn();
    await render(
      <Pager
        count={COUNT}
        active={0}
        onActive={landed}
        renderPage={(index) => <View testID={`page-${String(index)}`} />}
      />,
    );
    await swipeTo(3, 0);
    expect(landed).toHaveBeenCalledWith(3);
  });
});
