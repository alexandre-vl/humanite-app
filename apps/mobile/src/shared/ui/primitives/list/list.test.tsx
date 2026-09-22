import { SIZES, SPACING } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { List } from './list';

/** More items than any window holds, so what the list leaves out is visible. */
const MANY = [...Array.from({ length: 60 }).keys()];

const isLayers = (value: unknown): value is readonly unknown[] => Array.isArray(value);

type Measure = 'top' | 'height' | 'paddingTop';

const isMeasured = (value: unknown, field: Measure): value is Readonly<Record<Measure, number>> =>
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

/**
 * How far down the list pushed its own content, read off the scroll view it renders.
 *
 * This is the promise the list makes in place of measuring anything — it insets by exactly what its bands hide — and
 * until now nothing read it. Every test above reads where a band was laid; none read what the band cost the content,
 * so a list could hide its first row under its own masthead and stay green.
 */
const contentInset = (): number => {
  let node = screen.getByTestId('un').parent;
  while (node !== null && node.type !== 'RCTScrollView') {
    node = node.parent;
  }
  const style: unknown = node?.props['contentContainerStyle'];
  const [inset] = isLayers(style) ? style : [];
  if (!isMeasured(inset, 'paddingTop')) {
    throw new Error('la liste ne dit pas de combien elle décale son contenu');
  }
  return inset.paddingTop;
};

describe('List', () => {
  it('rend un élément par entrée, sous le fronton et la bande qui reste', async () => {
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

  it('accroche sa bande qui reste sous le fronton quand il y en a un', async () => {
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

  it('épingle sa bande qui reste tout en haut quand elle ne porte aucun fronton', async () => {
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

  it('décale son contenu de tout ce que cachent un fronton et deux rangées', async () => {
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
    expect(contentInset()).toBe(SIZES.headerBandPair);
    expect(contentInset()).toBe(SIZES.headerExpanded + SIZES.band * 2);
  });

  it('décale son contenu d’une seule rangée quand la bande n’en tient qu’une', async () => {
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
    expect(contentInset()).toBe(SIZES.headerBand);
  });

  it('ne décale son contenu que de la bande, quand rien ne la surmonte', async () => {
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
    expect(contentInset()).toBe(SIZES.band);
  });

  /**
   * The count is read off the band actually handed over, never off the count alone: a screen that names two rows and
   * hands no band would otherwise push its first article down under nothing at all.
   */
  it('ne décale rien pour des rangées qu’on annonce sans donner de bande', async () => {
    await render(
      <List
        items={['un']}
        keyOf={(item) => item}
        typeOf={() => 'row'}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
        stickyRows={2}
      />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(contentInset()).toBe(SIZES.headerExpanded);
  });

  it('ne décale rien du tout quand elle ne porte aucune bande', async () => {
    await render(
      <List items={['un']} keyOf={(item) => item} typeOf={() => 'row'} renderItem={(item) => <View testID={item} />} />,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(asked).not.toHaveLength(0);
    expect(asked.every((item) => MANY.includes(item))).toBe(true);
  });
});
