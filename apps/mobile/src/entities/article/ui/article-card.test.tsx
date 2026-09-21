import type { ArticleSummary, DisplayText } from '@huma/contracts';
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

/**
 * How many pictures a card put on the screen, which is what tells one shape's tree from another's. Hidden ones are
 * counted because every picture a card lays out is hidden on purpose: the headline beside it already says what it
 * shows, and a reader listening to the paper would otherwise hear each article twice. The primitive's own test holds
 * that; this one is only counting views.
 */
const pictures = (): number => screen.queryAllByTestId('picture', { includeHiddenElements: true }).length;

/** The colour a run of text was actually painted in, read back off the style the primitive gave it. */
const inkOf = (text: DisplayText): unknown => {
  const style: unknown = screen.getByText(text).props['style'];
  if (typeof style !== 'object' || style === null) {
    throw new Error('ce texte ne porte aucun style : le test ne lirait aucune encre');
  }
  return Reflect.get(style, 'color');
};

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

  /**
   * A card says two things and has to say them in that order. Both were printed in the ink of a title and in the
   * weight of one, four points apart — so the sentence that answers the headline read as a second, smaller headline,
   * and which to read first was left to the sizes alone. The ink is the claim: not which colour, only that the two
   * are not one.
   */
  it.each(SHAPES)('sépare sur %s l’encre du titre de celle du chapô', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(inkOf(summary.title)).not.toBe(inkOf(summary.standfirst));
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

  /**
   * The section is drawn only where a screen supplies it. A front page and a search both mix sections and a card
   * that did not say which it came from left the reader nothing to sort by; inside one section the very same word on
   * every card says nothing, so the screen decides and the card obeys. A chronicle is the exception: it already
   * carries a mark saying what it is, and two labels stacked over one title are one too many.
   */
  it.each(SHAPES.filter((shape) => shape !== 'column'))(
    'nomme sur %s la rubrique que l’écran lui donne',
    async (shape) => {
      const summary = illustrated(await everything());
      const view = await render(<ArticleCard shape={shape} summary={summary} name={asDisplayText('Monde')} />);
      expect(screen.getByText('Monde')).toBeTruthy();
      await view.rerender(<ArticleCard shape={shape} summary={summary} />);
      expect(screen.queryByText('Monde')).toBeNull();
    },
  );

  it('ne nomme pas deux fois ce qu’une chronique est déjà marquée être', async () => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape="column" summary={summary} name={asDisplayText('Monde')} />);
    expect(screen.getByText('Chronique')).toBeTruthy();
    expect(screen.queryByText('Monde')).toBeNull();
  });
});
