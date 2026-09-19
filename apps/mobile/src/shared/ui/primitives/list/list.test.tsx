import { SIZES } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { List } from './list';

/** More items than any window holds, so what the list leaves out is visible. */
const MANY = [...Array.from({ length: 60 }).keys()];

const isLayers = (value: unknown): value is readonly unknown[] => Array.isArray(value);

const isOffset = (value: unknown): value is Readonly<{ top: number }> =>
  typeof value === 'object' && value !== null && 'top' in value && typeof value.top === 'number';

/** Where the list hung its sticky band, read back from the style it gave the layer that carries it. */
const stickyTop = (): number => {
  const style: unknown = screen.getByTestId('sticky').parent?.props['style'];
  const [layer] = isLayers(style) ? style : [];
  if (!isOffset(layer)) {
    throw new Error('la bande collante ne porte pas de décalage lisible');
  }
  return layer.top;
};

describe('List', () => {
  it('renders an item for each entry, under the header and the sticky band', async () => {
    await render(
      <List
        items={['un', 'deux']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
        sticky={<View testID="sticky" />}
      />,
    );
    // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one
    // keeps that update inside act.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByTestId('sticky')).toBeTruthy();
    expect(await screen.findByTestId('un')).toBeTruthy();
    expect(await screen.findByTestId('deux')).toBeTruthy();
  });

  it('hangs its sticky band under the header when one stands above it', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
        sticky={<View testID="sticky" />}
      />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(stickyTop()).toBe(SIZES.headerExpanded);
  });

  it('pins its sticky band to the very top when it carries no header', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        sticky={<View testID="sticky" />}
      />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(stickyTop()).toBe(0);
  });

  it('shows what stands in when it holds nothing', async () => {
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

  it('mounts what the window asks for, not the whole list', async () => {
    await render(
      <List
        items={MANY}
        keyOf={(item) => String(item)}
        typeOf={() => 'row'}
        renderItem={() => <View testID="cell" />}
      />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    const mounted = screen.queryAllByTestId('cell').length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(MANY.length);
  });

  it('asks every item it mounts which tree it is', async () => {
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(asked).not.toHaveLength(0);
    expect(asked.every((item) => MANY.includes(item))).toBe(true);
  });
});
