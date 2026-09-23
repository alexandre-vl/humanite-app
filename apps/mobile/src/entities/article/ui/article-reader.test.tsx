import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { Article, Block } from '@huma/contracts';
import { ARTICLE, blocksOf, ContentApiError } from '@huma/contracts';
import { fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { formatPublished } from '#lib/format';
import { firstArticle, renderWithCache, settle, standfirstOf, styleOf } from '#lib/testing';
import { ArticleReader } from './article-reader';

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/** Every run of text the page prints, in the order it prints them — which is the order they are read in. */
const inOrder = (node: unknown): readonly string[] => {
  if (typeof node === 'string') {
    return [node];
  }
  const children: unknown = typeof node === 'object' && node !== null ? Reflect.get(node, 'children') : null;
  return isList(children) ? children.flatMap(inOrder) : [];
};

/**
 * Every corner any surface of the page turns by itself, named.
 *
 * Every style a node carries is read and not only the one called `style`: a scrolling region styles what it scrolls
 * under a second name, and the first version of this looked at one of the two — it passed a page whose content had
 * been given back the turned corner, which is exactly the regression it exists to catch.
 */
const cornersTurned = (node: unknown): readonly string[] => {
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  const props: unknown = Reflect.get(node, 'props');
  const styles: readonly unknown[] =
    typeof props === 'object' && props !== null
      ? Object.entries(props)
          .filter(([name]) => name === 'style' || name.endsWith('Style'))
          .map(([, value]: readonly [string, unknown]) => value)
      : [];
  const turned = styles
    .flatMap((style) => (isList(style) ? style : [style]))
    .flatMap((layer) =>
      typeof layer === 'object' && layer !== null
        ? Object.keys(layer).filter((key) => /^borderTop(?:Left|Right)Radius$/u.test(key))
        : [],
    );
  const children: unknown = Reflect.get(node, 'children');
  return [...turned, ...(isList(children) ? children.flatMap(cornersTurned) : [])];
};

/** One node of the rendered page, named off what the screen hands back rather than off the renderer's own types. */
type Node = ReturnType<typeof screen.getByText>;

/** Everything a node is laid inside, innermost first. */
const ancestorsOf = (node: Node): readonly Node[] => {
  const climbed: Node[] = [];
  for (let walked = node.parent; walked !== null; walked = walked.parent) {
    climbed.push(walked);
  }
  return climbed;
};

/** How far apart a box sets the things it holds, or nothing at all, which is the answer that was wrong. */
const spaceInside = (node: Node): number => {
  const gap = styleOf(node)['gap'];
  return typeof gap === 'number' ? gap : 0;
};

/** How a run of text is set, read back off the style the primitive resolved for it. */
type Typeset = Readonly<{ fontSize: number; color: string }>;

const isTypeset = (value: unknown): value is Typeset =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'fontSize') === 'number' &&
  typeof Reflect.get(value, 'color') === 'string';

const typesetOf = (text: string): Typeset => {
  const style = styleOf(screen.getByText(text));
  if (!isTypeset(style)) {
    throw new Error(`« ${text} » n’est posé dans aucune taille ni aucune encre : le test ne comparerait rien`);
  }
  return style;
};

const read = async (article: Article, onFollow: () => void = () => undefined): Promise<void> => {
  await renderWithCache(<ArticleReader id={article.id} onFollow={onFollow} />);
  await settle();
};

const holding = async (kind: Block['type']): Promise<Article> =>
  firstArticle(content, `un bloc ${kind}`, (article) => blocksOf(article).some((block) => block.type === kind));

/**
 * Most paragraphs of the corpus are one run long, so an article picked for holding a paragraph would pass a renderer
 * that dropped every run but the first. This one is picked for holding a sentence made of several.
 */
const holdingSeveralRuns = async (): Promise<Article> =>
  firstArticle(content, 'un paragraphe de plusieurs fragments', (article) =>
    blocksOf(article).some((block) => block.type === 'paragraph' && block.spans.length > 1),
  );

afterEach(() => {
  jest.restoreAllMocks();
});

/** An article the reader the app is may not read whole: one the source serves with its body kept back. */
const reserved = async (): Promise<Article> =>
  firstArticle(content, 'un corps retenu', (article) => article.body.kind === 'withheld');

describe('ArticleReader, face à un corps retenu', () => {
  /**
   * The head is the article's and the wall says why the rest is not there, and where a subscription is taken — in
   * words, with nothing to press: a reader's app may not send its reader to a purchase.
   */
  it('montre la tête de l’article, et le mur là où le corps aurait couru, sans rien à presser', async () => {
    const article = await reserved();
    await read(article);
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.getByText(t('article.withheld.title'))).toBeTruthy();
    expect(screen.getByText(t('article.withheld.where'))).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  /** A source that refuses the whole article puts up the same wall, rather than a try that cannot pass. */
  it('dresse le même mur quand la source refuse l’article entier, sans offrir d’essai', async () => {
    const article = await reserved();
    jest.spyOn(content, 'getArticle').mockRejectedValue(new ContentApiError('refused', 'réservé'));
    await read(article);
    expect(await screen.findByText(t('article.withheld.where'))).toBeTruthy();
    expect(screen.queryByText(t('action.retry'))).toBeNull();
  });
});

describe('ArticleReader', () => {
  /**
   * An article opened from anywhere says what it is before it says anything else, in the word a card prints over the
   * same title — and a plain article, which most are, says nothing there.
   */
  it('dit au-dessus du titre ce qu’est une opinion, et rien d’un article', async () => {
    const column = await firstArticle(content, 'une opinion', (article) => article.format === 'column');
    await read(column);
    expect(await screen.findByText(column.title)).toBeTruthy();
    expect(screen.getByText(t('format.column'))).toBeTruthy();
  });

  it('ne met aucun mot au-dessus du titre d’un article', async () => {
    const written = await firstArticle(content, 'un article', (article) => article.format === 'article');
    await read(written);
    expect(await screen.findByText(written.title)).toBeTruthy();
    for (const word of [t('format.video'), t('format.column'), t('format.series'), t('format.live')]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('rend le titre, le chapô et chaque fragment de chaque paragraphe', async () => {
    const article = await holdingSeveralRuns();
    await read(article);
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.getByText(standfirstOf(article))).toBeTruthy();
    const words = blocksOf(article).flatMap((block) =>
      block.type === 'paragraph' ? block.spans.map((span) => span.text) : [],
    );
    for (const run of words) {
      expect(screen.getByText(run)).toBeTruthy();
    }
  });

  /**
   * A crosshead was set in the article's own type: twenty-eight points of Anton in the paper's red, the same as the
   * title over it. A piece with three of them said its own title four times, each as loud as the last. What is asked
   * here is the order itself — smaller than the title, and in another ink — rather than a size and a colour, which
   * would be the table written out a second time.
   */
  it('donne aux intertitres une taille et une encre sous celles du titre de l’article', async () => {
    const article = await holding('heading');
    const crosshead = blocksOf(article).find((block) => block.type === 'heading');
    if (crosshead === undefined) {
      throw new Error('intertitre introuvable');
    }
    await read(article);
    await screen.findByText(article.title);
    const title = typesetOf(article.title);
    const under = typesetOf(crosshead.text);
    expect(under.fontSize).toBeLessThan(title.fontSize);
    expect(under.color).not.toBe(title.color);
  });

  /**
   * Who wrote a piece belongs to the head of it, with the standfirst and the date, which is where the Guardian's own
   * mobile template for a comment piece puts it and where the BBC wraps it together with the time. It was under the
   * picture: an article opened on a photograph credited to one name and was signed, four lines later and past that
   * credit, by another.
   */
  it('signe l’article avant la photo, et non sous la légende de la photo', async () => {
    const article = await firstArticle(
      content,
      'une photo légendée et une signature',
      (candidate) => candidate.hero?.caption !== undefined && candidate.format !== 'video',
    );
    const caption = article.hero?.caption;
    if (caption === undefined) {
      throw new Error('photo légendée introuvable');
    }
    const signature = article.byline;
    if (signature === undefined) {
      throw new Error('l’article n’est signé de personne');
    }
    await read(article);
    await screen.findByText(article.title);
    const order = inOrder(screen.toJSON());
    expect(order.indexOf(`Par ${signature}`)).toBeGreaterThan(order.indexOf(standfirstOf(article)));
    expect(order.indexOf(`Par ${signature}`)).toBeLessThan(order.indexOf(caption));
  });

  /**
   * The article was printed on a white sheet laid over a coloured ground, with its top-left corner turned by
   * forty-eight points and its top-right left square. No paper prints an article that way: a turned top corner is
   * what a phone draws round a modal, and Le Figaro's own stylesheet gives that radius to its share sheet and to
   * nothing else. What the rule catches is the shape, whatever colour it is painted.
   */
  it('imprime l’article sur une page, et non sur une feuille au coin retourné', async () => {
    const article = await holding('paragraph');
    await read(article);
    await screen.findByText(article.title);
    expect(cornersTurned(screen.toJSON())).toEqual([]);
  });

  /**
   * Nielsen's homepage guideline: the full article prints its date prominently — here with its hour, which the wire
   * already lists the same piece at.
   */
  it('date l’article en toutes lettres, avec l’heure où il a paru', async () => {
    const article = await holding('paragraph');
    await read(article);
    expect(await screen.findByText(formatPublished(article.publishedAt))).toBeTruthy();
  });

  it('signe l’article du nom que le journal écrit, précédé du mot qui l’annonce', async () => {
    const article = await holding('paragraph');
    const signature = article.byline;
    if (signature === undefined) {
      throw new Error('l’article n’est signé de personne');
    }
    await read(article);
    expect(await screen.findByText(`Par ${signature}`, { exact: false })).toBeTruthy();
  });

  /**
   * The linked card sets its own parts apart, and the sheet under it cannot do it for them.
   *
   * A torn sheet of paper spaces the things laid on it, and this card laid exactly one thing on it — the target
   * holding the picture, the title and the sentence — so the spacing went to a single child and none of the three
   * got any. Measured on an A065: the title's box began twenty-two pixels inside the picture's, and the sentence
   * twenty-two inside the title's. The callout printed a few lines above lays its three parts on the sheet itself
   * and never showed it, which is why nothing here said the sheet's own gap had stopped reaching anybody.
   */
  it('écarte la photo, le titre et la phrase de la carte liée', async () => {
    const article = await holding('related');
    const related = blocksOf(article).find((block) => block.type === 'related');
    if (related === undefined) {
      throw new Error('bloc lié introuvable');
    }
    const target = related.summary;
    await read(article);
    const title = await screen.findByText(target.title);
    // The one thing on a reading screen that answers a press of its own: prose sets its links as words, without a
    // role, so the card is the only node the page announces as one.
    const card = screen.getByRole('link');
    expect(spaceInside(card)).toBeGreaterThan(0);
    // And the box between the title and that target — the pair of words — sets them apart too, more closely than
    // the picture is set from them, which is how a card of the feed groups the very same three things.
    const pair = ancestorsOf(title).find((node) => spaceInside(node) > 0);
    expect(pair).not.toBe(card);
    expect(spaceInside(pair ?? card)).toBeLessThan(spaceInside(card));
  });

  it('annonce l’article lié par son titre, et le rapporte quand on le presse', async () => {
    const article = await holding('related');
    const related = blocksOf(article).find((block) => block.type === 'related');
    if (related === undefined) {
      throw new Error('bloc lié introuvable');
    }
    const target = related.summary;
    const follow = jest.fn();
    await read(article, follow);
    expect(await screen.findByText('Sur le même thème')).toBeTruthy();
    await fireEvent.press(await screen.findByText(target.title));
    expect(follow).toHaveBeenCalledWith({ kind: 'article', id: related.summary.id });
  });

  /**
   * A film opens where it lives. The journal keeps its films on YouTube with no running time, and the app plays none
   * itself: pressing the film hands its address up as a link out of the paper, which the screen opens.
   */
  it('ouvre le film d’une vidéo là où il vit, sans le jouer', async () => {
    const video = await firstArticle(content, 'une vidéo', (article) => article.format === 'video');
    const url = 'https://youtu.be/dfZt_ZVhtus';
    jest.spyOn(content, 'getArticle').mockResolvedValue(ARTICLE.parse({ ...video, film: { url } }));
    const follow = jest.fn();
    await read(video, follow);
    await fireEvent.press(await screen.findByText(t('article.film')));
    expect(follow).toHaveBeenCalledWith({ kind: 'external', url });
  });

  it('montre l’image d’une vidéo sans film, et rien à presser', async () => {
    const video = await firstArticle(
      content,
      'une vidéo',
      (article) => article.format === 'video' && article.film === undefined,
    );
    await read(video);
    expect(await screen.findByText(video.title)).toBeTruthy();
    expect(screen.queryByText(t('article.film'))).toBeNull();
  });
});
