import { SIZES } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { List } from './list';

/** More items than any window holds, so what the list leaves out is visible. */
const MANY = [...Array.from({ length: 60 }).keys()];

const isLayers = (value: unknown): value is readonly unknown[] => Array.isArray(value);

const isMeasured = (value: unknown, field: 'top' | 'height'): value is Readonly<Record<typeof field, number>> =>
  typeof value === 'object' && value !== null && field in value && typeof Reflect.get(value, field) === 'number';

/** How the list laid its sticky band, read back from the style it gave the layer that carries it. */
const stickyLayer = (field: 'top' | 'height'): number => {
  const style: unknown = screen.getByTestId('sticky').parent?.props['style'];
  const [layer] = isLayers(style) ? style : [];
  if (!isMeasured(layer, field)) {
    throw new Error(`la bande collante ne porte pas de ${field} lisible`);
  }
  return layer[field];
};

const stickyTop = (): number => stickyLayer('top');

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

  /**
   * A band of one kind of thing takes one row; a band that stacks two — a screen's own destinations over the sections
   * of the paper — takes two, and the list has to be told, having no way to see what a screen put in one.
   */
  it('donne à la bande qui reste la hauteur des rangées qu’on lui déclare', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
        sticky={<View testID="sticky" />}
        stickyRows={2}
      />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(stickyLayer('height')).toBe(SIZES.bandPair);
    expect(stickyLayer('height')).toBe(SIZES.band * 2);
  });

  it('ne donne qu’une rangée à une bande qui n’en demande pas', async () => {
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
    expect(stickyLayer('height')).toBe(SIZES.band);
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

  it('holds a pinned item at the top, over the run it opens', async () => {
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    // A pinned item is mounted twice: once where the data puts it, once laid over the top of the frame. The single
    // head of this list is the one in force at rest, so it is the copy that shows. Nothing else about pinning shows
    // in this runner — every cell measures the same height here, so how one head pushes the next off is fiction.
    expect(screen.queryAllByTestId('head')).toHaveLength(2);
    expect(screen.queryAllByTestId('row').length).toBeGreaterThan(0);
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
