import { SIZES, SPACING } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { settle } from '../../../lib/testing';
import { List } from './list';

/** More items than any window holds, so what the list leaves out is visible. */
const MANY = [...Array.from({ length: 60 }).keys()];

const isLayers = (value: unknown): value is readonly unknown[] => Array.isArray(value);

const isInset = (value: unknown): value is Readonly<{ paddingTop: number }> =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'paddingTop') === 'number';

/**
 * How far down the list pushed its own content, read off the scroll view it renders.
 *
 * This is the promise the list makes in place of measuring anything — it insets by exactly what its masthead hides —
 * and a test that read only where the masthead was laid would let a list hide its first row under it and stay green.
 */
const contentInset = (): number => {
  let node = screen.getByTestId('un').parent;
  while (node !== null && node.type !== 'RCTScrollView') {
    node = node.parent;
  }
  const style: unknown = node?.props['contentContainerStyle'];
  const [inset] = isLayers(style) ? style : [];
  if (!isInset(inset)) {
    throw new Error('la liste ne dit pas de combien elle décale son contenu');
  }
  return inset.paddingTop;
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

  it('ne décale rien du tout quand elle ne porte aucun fronton', async () => {
    await render(
      <List items={['un']} keyOf={(item) => item} typeOf={() => 'row'} renderItem={(item) => <View testID={item} />} />,
    );
    await settle();
    expect(contentInset()).toBe(SPACING.none);
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
    expect(screen.queryAllByTestId('head')).toHaveLength(2);
    expect(screen.queryAllByTestId('row').length).toBeGreaterThan(0);
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
