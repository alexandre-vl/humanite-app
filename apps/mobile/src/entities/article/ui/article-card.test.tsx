import type { ArticleSummary, DisplayText } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { asDisplayText } from '#lib/display-text';
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

/** One node of the rendered tree, named off what the screen hands back rather than off the renderer's own types. */
type Node = ReturnType<typeof screen.getByText>;

const ancestorsOf = (node: Node): readonly Node[] => {
  const up: Node[] = [];
  for (let walked = node.parent; walked !== null; walked = walked.parent) {
    up.push(walked);
  }
  return up;
};

/** The innermost thing that holds both of two nodes, which is what says how the two are laid out against each other. */
const holdingBoth = (one: Node, other: Node): Node => {
  const above = new Set<Node>(ancestorsOf(one));
  const shared = ancestorsOf(other).find((node) => above.has(node));
  if (shared === undefined) {
    throw new Error('ces deux éléments ne sont pas sur la même page : le test ne mesurerait rien');
  }
  return shared;
};

/**
 * How many pictures each shape mounts. A list hands a cell to another item only when both answered the same shape,
 * so a shape that stopped agreeing with its tree would not fail anywhere — the cells would simply be passed between
 * trees that do not match, and the recycling would be wrong rather than absent. The table answers for every shape
 * the rhythm declares, so a shape added there stops the build here.
 */
const PICTURES = { lead: 1, line: 1, column: 0, brief: 0 } satisfies Readonly<Record<CardShape, number>>;

const SHAPES: readonly CardShape[] = ['lead', 'line', 'column', 'brief'];

/** The shapes with room for the sentence under a title. A line has none, and that is the point of a line. */
const WITH_SUMMARY: readonly CardShape[] = ['lead', 'column', 'brief'];

const CASES: readonly (readonly [CardShape, number])[] = SHAPES.map((shape) => [shape, PICTURES[shape]]);

describe('ArticleCard', () => {
  it('éprouve chaque forme que le rythme sait nommer', () => {
    expect(SHAPES).toHaveLength(Object.keys(PICTURES).length);
  });

  it.each(CASES)('monte %s avec le nombre d’images qu’elle promet', async (shape, count) => {
    await render(<ArticleCard shape={shape} summary={illustrated(await everything())} />);
    expect(pictures()).toBe(count);
  });

  it.each(SHAPES)('donne à %s son titre', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.getByText(summary.title)).toBeTruthy();
  });

  it.each(WITH_SUMMARY)('donne à %s le chapô qui répond à son titre', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.getByText(summary.standfirst)).toBeTruthy();
  });

  /**
   * A line is the shape three cards in four take, and it carries no standfirst. On a phone the Guardian shows none on
   * any card and the BBC shows none on any card; Le Monde shows one on fifteen of a hundred and seven. A sentence
   * under every title is what made this front a wall of grey in which nothing was subordinate to anything.
   */
  it('ne met pas de chapô sur une ligne, la forme que trois cartes sur quatre prennent', async () => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape="line" summary={summary} />);
    expect(screen.queryByText(summary.standfirst)).toBeNull();
  });

  /**
   * The title used to run the full width of the card with the picture under it, beside the standfirst: the title was
   * cut at two lines while the room next to the picture went to a sentence, and the card had two left edges. NN/g's
   * rule for a list row is the one that broke — a reader scans a single left margin — so the words take one column
   * and the picture the other, on one row.
   */
  it('pose le titre et la vignette d’une ligne sur une même rangée', async () => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape="line" summary={summary} />);
    const picture = screen.getByTestId('picture', { includeHiddenElements: true });
    const together: unknown = holdingBoth(screen.getByText(summary.title), picture).props['style'];
    expect(together).toMatchObject({ flexDirection: 'row' });
  });

  /**
   * A picture held to a ratio carries no margin of its own, and what it costs is not obvious enough to leave to
   * memory. A cell of a virtualised list is laid out at a height the list already knows, so eight points of margin
   * under the picture came off the picture's height — and a box whose height is cut and whose ratio is fixed loses
   * width with it. Measured on an A065 the day it was written: the lead picture went from `[42,399][1038,959]` to
   * `[42,399][1001,938]`, thirty-seven pixels short of the block it is supposed to fill, and no bench could see it.
   * The room between a picture and what follows belongs to the card.
   */
  it('ne donne aucune marge propre à une photo tenue par son rapport', async () => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape="lead" summary={summary} />);
    const style: unknown = screen.getByTestId('picture', { includeHiddenElements: true }).props['style'];
    const laid = typeof style === 'object' && style !== null ? Object.keys(style) : [];
    expect(laid.filter((key) => key.startsWith('margin'))).toEqual([]);
    expect(laid).toContain('aspectRatio');
  });

  /**
   * Nielsen's homepage guideline 84: as long as every story on the front is of the week, no card needs the date, and
   * the full article needs one printed prominently. Of the eight fronts measured, Le Monde and NPR print nothing at
   * all, the Guardian prints an age only under twelve hours, and not one prints a calendar date on every card. This
   * one printed `13/09/2026` five times a screen, under a corpus filed across three days of one week.
   */
  it.each(SHAPES)('ne date pas %s : une une d’une semaine n’a pas de date par carte', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/u)).toBeNull();
  });

  /**
   * A card says two things and has to say them in that order. Both were printed in the ink of a title and in the
   * weight of one, four points apart — so the sentence that answers the headline read as a second, smaller headline,
   * and which to read first was left to the sizes alone. The ink is the claim: not which colour, only that the two
   * are not one.
   */
  it.each(WITH_SUMMARY)('sépare sur %s l’encre du titre de celle du chapô', async (shape) => {
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
   * The premium mark shares the line over the title with the section, on every shape. It had a line of its own, where
   * it left one shape a row taller than another mounting the very same components — the split the recycling then had
   * to carry.
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
