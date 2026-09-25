import { SIZES, SPACING } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { nearestAbove, scrollViewAbove, settle, styleOf } from '../../../lib/testing';
import type { Rendered } from '../../../lib/testing';
import { List } from './list';

/** More items than any window holds, so what the list leaves out is visible. */
const MANY = [...Array.from({ length: 60 }).keys()];

/** The test ids the screen renders, in the order it lays them out. */
const namedInOrder = (): readonly string[] => {
  const named: string[] = [];
  const walk = (node: unknown): void => {
    if (isList(node)) {
      for (const child of node) {
        walk(child);
      }
    } else if (isRecord(node)) {
      const props = node['props'];
      if (isRecord(props) && typeof props['testID'] === 'string') {
        named.push(props['testID']);
      }
      walk(node['children']);
    }
  };
  walk(screen.toJSON());
  return named;
};

/** The frame and the cell the runner measures every list with (`jest.setup.ts`), in points. */
const FRAME = 900;
const CELL = 100;

/** How far down its content the list lays the cell an item is drawn in, in points. */
const placeOf = (id: string): number =>
  nearestAbove(
    screen.getByTestId(id),
    (each) => {
      const top = styleOf(each)['top'];
      return typeof top === 'number' ? top : undefined;
    },
    'l’élément n’est posé dans aucune cellule : le test ne vérifierait rien',
  );

/** The native scroll view the list renders, found from the item `un` up. */
const scrollView = (): Rendered => scrollViewAbove(screen.getByTestId('un'), 'la liste ne rend aucune vue défilante');

/**
 * How far down the list pushed its own content, read off the scroll view it renders.
 *
 * This is the promise the list makes in place of measuring anything — it insets by exactly what its masthead hides —
 * and a test that read only where the masthead was laid would let a list hide its first row under it and stay green.
 */
const contentInset = (): number => {
  const inset = styleOf(scrollView(), 'contentContainerStyle')['paddingTop'];
  if (typeof inset !== 'number') {
    throw new Error('la liste ne dit pas de combien elle décale son contenu');
  }
  return inset;
};

describe('List', () => {
  it('rend un élément par entrée, sous le fronton', async () => {
    await render(
      <List
        items={['un', 'deux']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
      />,
    );
    await settle();
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(await screen.findByTestId('un')).toBeTruthy();
    expect(await screen.findByTestId('deux')).toBeTruthy();
  });

  it('décale son contenu de toute la hauteur du fronton', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
      />,
    );
    await settle();
    expect(contentInset()).toBe(SIZES.headerExpanded);
  });

  /**
   * The band holds the screen's name at the reader's step and at the phone's text size, and at the largest of both the
   * name ran to two lines seventy points tall: held to the tokens' height, the band cut it to « Mes lectur » with the
   * bottom of every letter gone (iPhone simulator, 25/09/2026). Measured, it grows to what it holds, and the content
   * under it starts that much lower.
   */
  it('grandit avec ce qu’il porte, et décale son contenu d’autant', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
      />,
    );
    await settle();
    const band = nearestAbove(
      screen.getByTestId('header'),
      (node) => (typeof node.props['onLayout'] === 'function' ? node : undefined),
      'le fronton n’est posé dans rien qui le mesure',
    );
    const tall = SIZES.headerExpanded * 3;
    await fireEvent(band, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: tall } } });
    expect(contentInset()).toBe(tall);
  });

  it('ne décale rien du tout quand elle ne porte aucun fronton', async () => {
    await render(
      <List items={['un']} keyOf={(item) => item} typeOf={() => 'row'} renderItem={(item) => <View testID={item} />} />,
    );
    await settle();
    expect(contentInset()).toBe(SPACING.none);
  });

  /**
   * A search answer pressed straight after typing only put the keyboard away on the A065, and a second press opened
   * it: the scroll view spends the first touch on the keyboard unless told the item handles it.
   */
  it('laisse un élément répondre au premier toucher sous le clavier, et range le clavier au défilement', async () => {
    await render(
      <List items={['un']} keyOf={(item) => item} typeOf={() => 'row'} renderItem={(item) => <View testID={item} />} />,
    );
    await settle();
    expect(scrollView().props['keyboardShouldPersistTaps']).toBe('handled');
    expect(scrollView().props['keyboardDismissMode']).toBe('on-drag');
  });

  /**
   * A front pulled down to be read again kept its old first card at the top of the A065, the three that had just come
   * in hidden above it: the list under this one holds the item in view still, a reader at the top included, unless the
   * scroll view is told otherwise.
   */
  it('garde sa place à qui a défilé, et mène au nouveau haut qui lit tout en haut', async () => {
    await render(
      <List items={['un']} keyOf={(item) => item} typeOf={() => 'row'} renderItem={(item) => <View testID={item} />} />,
    );
    await settle();
    expect(scrollView().props['maintainVisibleContentPosition']).toHaveProperty('autoscrollToTopThreshold', 0);
  });

  /**
   * The list under this one gives a key one cell, at the last place it is handed that key, and leaves the places
   * before it empty. On the iPhone simulator on 25/09/2026, what the app answered « volksw » with was seven lines for
   * two articles, and nothing was drawn in the first 950 points of the list: the screen stood white.
   */
  it('dessine chaque élément une fois, là où il vient d’abord, sans laisser de trou au-dessus', async () => {
    await render(
      <List
        items={['un', 'deux', 'un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
      />,
    );
    await settle();
    expect(screen.getAllByTestId('un')).toHaveLength(1);
    expect(placeOf('un')).toBe(0);
    expect(placeOf('deux')).toBe(CELL);
  });

  it('montre ce qui en tient lieu quand elle ne contient rien', async () => {
    await render(
      <List
        items={[]}
        keyOf={(item: string) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        empty={<View testID="empty" />}
      />,
    );
    expect(await screen.findByTestId('empty')).toBeTruthy();
  });

  it('monte ce que la fenêtre demande, et non toute la liste', async () => {
    await render(
      <List
        items={MANY}
        keyOf={(item) => String(item)}
        typeOf={() => 'row'}
        renderItem={() => <View testID="cell" />}
      />,
    );
    await settle();
    const mounted = screen.queryAllByTestId('cell').length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(MANY.length);
  });

  it('tient un élément épinglé en haut, au-dessus de la série qu’il ouvre', async () => {
    const isHead = (item: number): boolean => item === 0;
    await render(
      <List
        items={MANY}
        keyOf={(item) => String(item)}
        typeOf={(item) => (isHead(item) ? 'head' : 'row')}
        pinned={isHead}
        renderItem={(item) => <View testID={isHead(item) ? 'head' : 'row'} />}
      />,
    );
    await settle();
    // A pinned item is mounted twice: once where the data puts it, once laid over the top of the frame. The single
    // head of this list is the one in force at rest, so it is the copy that shows. Nothing else about pinning shows
    // in this runner — every cell measures the same height here, so how one head pushes the next off is fiction.
    // Only the first is heard: the copy is for the eye, and a reader listening walks the rows in their order.
    expect(screen.queryAllByTestId('head', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.queryAllByTestId('head')).toHaveLength(1);
    expect(screen.queryAllByTestId('row').length).toBeGreaterThan(0);
  });

  /** The foot stands under the last item, where a reader who reaches the end looks for what comes next. */
  it('pose son pied sous le dernier élément', async () => {
    await render(
      <List
        items={['un', 'deux']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        footer={<View testID="pied" />}
      />,
    );
    await settle();
    const named = namedInOrder();
    expect(named.indexOf('pied')).toBeGreaterThan(named.indexOf('deux'));
    expect(named.indexOf('deux')).toBeGreaterThan(named.indexOf('un'));
  });

  /**
   * The next part of the wire took 11.3 seconds to come on the iPhone simulator on 25/09/2026, and asked for with half
   * a frame left, all of it was spent at the last item. The list asks four frames ahead, and not before.
   */
  it('demande la suite quatre hauteurs de cadre avant la fin, et pas plus tôt', async () => {
    const onEndReached = jest.fn();
    await render(
      <List
        items={MANY}
        keyOf={(item) => String(item)}
        typeOf={() => 'row'}
        renderItem={() => <View testID="cell" />}
        onEndReached={onEndReached}
      />,
    );
    await settle();
    const scrolledTo = async (offset: number): Promise<void> => {
      const [cell] = screen.getAllByTestId('cell');
      if (cell === undefined) {
        throw new Error('la liste ne monte aucun élément : le test ne vérifierait rien');
      }
      await fireEvent.scroll(scrollViewAbove(cell, 'la liste ne rend aucune vue défilante'), {
        nativeEvent: {
          contentOffset: { x: 0, y: offset },
          contentSize: { width: 400, height: MANY.length * CELL },
          layoutMeasurement: { width: 400, height: FRAME },
        },
      });
      // The list hears the scroll settle a tenth of a second after the last report, and lays itself out again then.
      await act(async () => new Promise((resolve) => setTimeout(resolve, 150)));
    };
    const fourFramesShort = MANY.length * CELL - FRAME - 4 * FRAME;
    await scrolledTo(fourFramesShort - 1);
    expect(onEndReached).not.toHaveBeenCalled();
    await scrolledTo(fourFramesShort);
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it('demande à chaque élément qu’elle monte quel arbre il est', async () => {
    const asked: number[] = [];
    await render(
      <List
        items={MANY}
        keyOf={(item) => String(item)}
        typeOf={(item) => {
          asked.push(item);
          return 'row';
        }}
        renderItem={() => <View testID="cell" />}
      />,
    );
    await settle();
    expect(asked).not.toHaveLength(0);
    expect(asked.every((item) => MANY.includes(item))).toBe(true);
  });
});
