import type { ArticleSummary } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { asDisplayText } from '#lib/display-text';
import { formatDate } from '#lib/format';
import { Text } from '#primitives/text';
import type { CardShape } from '../model/rhythm';
import { ArticleCard } from './article-card';

/** The whole corpus, which is what a card has to hold over. */
const everything = async (): Promise<readonly ArticleSummary[]> => (await content.getFeed({ limit: 100 })).items;

/** An article that carries a picture: the shapes are told apart by what they do with one. */
const illustrated = (items: readonly ArticleSummary[]): ArticleSummary => {
  const found = items.find((item) => item.hero !== undefined);
  if (found === undefined) {
    throw new Error('aucun article illustré : le test ne vérifierait rien');
  }
  return found;
};

/** How many pictures a card put on the screen, which is what tells one shape's tree from another's. */
const pictures = (): number => screen.queryAllByTestId('picture').length;

/**
 * How many pictures each shape mounts. A list hands a cell to another item only when both answered the same shape,
 * so a shape that stopped agreeing with its tree would not fail anywhere — the cells would simply be passed between
 * trees that do not match, and the recycling would be wrong rather than absent. The table answers for every shape
 * the rhythm declares, so a shape added there stops the build here.
 */
const PICTURES = { lead: 1, stacked: 1, line: 1, column: 0, brief: 0 } satisfies Readonly<Record<CardShape, number>>;

const SHAPES: readonly CardShape[] = ['lead', 'stacked', 'line', 'column', 'brief'];

const CASES: readonly (readonly [CardShape, number])[] = SHAPES.map((shape) => [shape, PICTURES[shape]]);

describe('ArticleCard', () => {
  it('éprouve chaque forme que le rythme sait nommer', () => {
    expect(SHAPES).toHaveLength(Object.keys(PICTURES).length);
  });

  it.each(CASES)('monte %s avec le nombre d’images qu’elle promet', async (shape, count) => {
    await render(<ArticleCard shape={shape} summary={illustrated(await everything())} />);
    expect(pictures()).toBe(count);
  });

  it.each(SHAPES)('donne à %s son titre, son chapô et sa date', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.getByText(summary.title)).toBeTruthy();
    expect(screen.getByText(summary.standfirst)).toBeTruthy();
    expect(screen.getByText(formatDate(summary.publishedAt))).toBeTruthy();
  });

  it.each(SHAPES)('porte sur %s ce que l’écran permet de faire de l’article', async (shape) => {
    const action = <Text variant="label">{asDisplayText('garder')}</Text>;
    await render(<ArticleCard shape={shape} summary={illustrated(await everything())} action={action} />);
    expect(screen.getByText('garder')).toBeTruthy();
  });

  /**
   * The premium mark shares the last line with the date on every shape. It had a line of its own, where it left one
   * shape a row taller than another mounting the very same components — the split the recycling then had to carry.
   */
  it.each(SHAPES)('ne marque sur %s que les articles réservés aux abonnés', async (shape) => {
    const items = await everything();
    const reserved = items.find((item) => item.access === 'premium');
    const open = items.find((item) => item.access === 'free');
    if (reserved === undefined || open === undefined) {
      throw new Error('le contenu ne sert pas les deux accès : le test ne vérifierait rien');
    }
    const view = await render(<ArticleCard shape={shape} summary={reserved} />);
    expect(screen.getByText('Abonnés')).toBeTruthy();
    await view.rerender(<ArticleCard shape={shape} summary={open} />);
    expect(screen.queryByText('Abonnés')).toBeNull();
  });

  it('annonce une chronique comme telle, et la signe quand la rédaction est arrivée', async () => {
    const summary = illustrated(await everything());
    const view = await render(<ArticleCard shape="column" summary={summary} signature={asDisplayText('Yves K.')} />);
    expect(screen.getByText('Chronique')).toBeTruthy();
    expect(screen.getByText('Yves K.')).toBeTruthy();
    await view.rerender(<ArticleCard shape="column" summary={summary} />);
    expect(screen.getByText('Chronique')).toBeTruthy();
    expect(screen.queryByText('Yves K.')).toBeNull();
  });

  it.each(SHAPES.filter((shape) => shape !== 'column'))('ne dit pas « Chronique » sur %s', async (shape) => {
    await render(<ArticleCard shape={shape} summary={illustrated(await everything())} />);
    expect(screen.queryByText('Chronique')).toBeNull();
  });
});
