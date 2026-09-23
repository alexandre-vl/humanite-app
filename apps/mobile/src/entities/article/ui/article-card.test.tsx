import type { ArticleSummary, DisplayText } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { asDisplayText } from '#lib/display-text';
import { formatHour, formatLongDate } from '#lib/format';
import { everyArticle, standfirstOf } from '#lib/testing';
import { Text } from '#primitives/text';
import type { CardShape } from '../model/rhythm';
import { ArticleCard } from './article-card';

/** The whole paper, which is what a card has to hold over. */
const everything = async (): Promise<readonly ArticleSummary[]> => everyArticle(content);

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

const DAY = 86_400_000;

/**
 * The shapes with room for the sentence under a title. A line has none, and that is the point of a line; a column has
 * none either, two in three of the journal's being filed without one and served with the opening of the body cut off.
 */
const WITH_SUMMARY: readonly CardShape[] = ['lead', 'brief'];

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
    expect(screen.getByText(standfirstOf(summary))).toBeTruthy();
  });

  /**
   * A line is the shape three cards in four take, and it carries no standfirst. On a phone the Guardian shows none on
   * any card and the BBC shows none on any card; Le Monde shows one on fifteen of a hundred and seven. A sentence
   * under every title is what made this front a wall of grey in which nothing was subordinate to anything.
   */
  it.each(['line', 'column'] as const)('ne met pas de chapô sur %s', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.queryByText(standfirstOf(summary))).toBeNull();
  });

  /** A headline cut is a headline lost: the journal's lost their end on two cards in five at the old clamps. */
  it.each(SHAPES)('ne coupe jamais le titre de %s', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(screen.getByText(summary.title).props['numberOfLines']).toBeUndefined();
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
  it('ne donne aucune marge propre à une photo tenue par son cadre', async () => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape="lead" summary={summary} />);
    const picture = screen.getByTestId('picture', { includeHiddenElements: true });
    const keysOf = (style: unknown): readonly string[] =>
      typeof style === 'object' && style !== null ? Object.keys(style) : [];
    const own = keysOf(picture.props['style']);
    const frame = keysOf(picture.parent?.props['style']);
    expect([...own, ...frame].filter((key) => key.startsWith('margin'))).toEqual([]);
    expect(frame).toContain('aspectRatio');
  });

  /**
   * Every card says when its item was published, written against the day the reader reads on: the journal's front
   * runs over seventeen hours, and a card that printed nothing told a piece of last night from one of this morning by
   * nothing at all. The clock is pinned, so the case reads the same on any day it is run.
   */
  it.each(SHAPES)('date %s de son heure le jour même, et de son année une autre année', async (shape) => {
    const summary = illustrated(await everything());
    const published = Date.parse(summary.publishedAt);
    const clock = jest.spyOn(Date, 'now').mockReturnValue(published);
    try {
      await render(<ArticleCard shape={shape} summary={summary} />);
      expect(screen.getByText(formatHour(summary.publishedAt))).toBeTruthy();
      await screen.unmount();
      clock.mockReturnValue(published + 400 * DAY);
      await render(<ArticleCard shape={shape} summary={summary} />);
      expect(screen.getByText(formatLongDate(summary.publishedAt))).toBeTruthy();
    } finally {
      clock.mockRestore();
    }
  });

  it.each(WITH_SUMMARY)('sépare sur %s l’encre du titre de celle du chapô', async (shape) => {
    const summary = illustrated(await everything());
    await render(<ArticleCard shape={shape} summary={summary} />);
    expect(inkOf(summary.title)).not.toBe(inkOf(standfirstOf(summary)));
  });

  it.each(SHAPES)('porte sur %s ce que l’écran permet de faire de l’article', async (shape) => {
    const action = <Text variant="label">{asDisplayText('garder')}</Text>;
    await render(<ArticleCard shape={shape} summary={illustrated(await everything())} action={action} />);
    expect(screen.getByText('garder')).toBeTruthy();
  });

  /**
   * Four items in five are reserved to subscribers, so a mark on each of those told a reader nothing; the mark is on
   * the exception, the item anyone can read, and on nothing else.
   */
  it.each(SHAPES)('ne marque sur %s que les articles en accès libre', async (shape) => {
    const items = await everything();
    const reserved = items.find((item) => item.access === 'premium');
    const open = items.find((item) => item.access === 'free');
    if (reserved === undefined || open === undefined) {
      throw new Error('le contenu ne sert pas les deux accès : le test ne vérifierait rien');
    }
    const view = await render(<ArticleCard shape={shape} summary={open} />);
    expect(screen.getByText(t('article.free'))).toBeTruthy();
    await view.rerender(<ArticleCard shape={shape} summary={reserved} />);
    expect(screen.queryByText(t('article.free'))).toBeNull();
  });

  it('annonce une opinion comme telle, et la signe quand la rédaction est arrivée', async () => {
    const column = (await everything()).find((summary) => summary.format === 'column');
    if (column === undefined) {
      throw new Error('le contenu ne sert aucune opinion : le test ne vérifierait rien');
    }
    const view = await render(<ArticleCard shape="column" summary={column} signature={asDisplayText('Yves K.')} />);
    expect(screen.getByText(t('format.column'))).toBeTruthy();
    expect(screen.getByText('Yves K.')).toBeTruthy();
    await view.rerender(<ArticleCard shape="column" summary={column} />);
    expect(screen.getByText(t('format.column'))).toBeTruthy();
    expect(screen.queryByText('Yves K.')).toBeNull();
  });

  /**
   * What an item is, when it is anything but an article, is said over its title on every shape: of all a paper prints
   * there, it is the one word the service knows of every item. An article, which most items are, carries none.
   */
  it.each(SHAPES.filter((shape) => shape !== 'column'))(
    'dit sur %s qu’une vidéo en est une, et rien d’un article',
    async (shape) => {
      const all = await everything();
      const video = all.find((summary) => summary.format === 'video');
      const written = all.find((summary) => summary.format === 'article');
      if (video === undefined || written === undefined) {
        throw new Error('le contenu ne sert pas une vidéo et un article : le test ne vérifierait rien');
      }
      const view = await render(<ArticleCard shape={shape} summary={video} />);
      expect(screen.getByText(t('format.video'))).toBeTruthy();
      await view.rerender(<ArticleCard shape={shape} summary={written} />);
      for (const word of [t('format.video'), t('format.column'), t('format.series'), t('format.live')]) {
        expect(screen.queryByText(word)).toBeNull();
      }
    },
  );
});
