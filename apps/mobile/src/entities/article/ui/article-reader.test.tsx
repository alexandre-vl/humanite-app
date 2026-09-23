import { describe, expect, it, jest } from '@jest/globals';
import type { Article } from '@huma/contracts';
import { PALETTE } from '@huma/design-tokens';
import { fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { asDisplayText } from '#lib/display-text';
import { formatLongDate } from '#lib/format';
import { everyArticle, renderWithCache, settle } from '#lib/testing';
import { ArticleReader } from './article-reader';

/** What the screen answers when the reader asks which section an article ran in, in one word the corpus never uses. */
const SECTION = asDisplayText('Rubrique');

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
  const style: unknown = node.props['style'];
  const gap: unknown = typeof style === 'object' && style !== null ? Reflect.get(style, 'gap') : null;
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
  const style: unknown = screen.getByText(text).props['style'];
  if (!isTypeset(style)) {
    throw new Error(`« ${text} » n’est posé dans aucune taille ni aucune encre : le test ne comparerait rien`);
  }
  return style;
};

const read = async (
  article: Article,
  onFollow: () => void = () => undefined,
  onSupport: () => void = () => undefined,
): Promise<void> => {
  await renderWithCache(
    <ArticleReader id={article.id} names={() => SECTION} onFollow={onFollow} onSupport={onSupport} />,
  );
  await settle();
};

/** The first article of the corpus whose body satisfies `holds`, so a test never asserts on a shape by luck. */
const first = async (what: string, holds: (article: Article) => boolean): Promise<Article> => {
  for (const summary of await everyArticle(content)) {
    const article = await content.getArticle(summary.id);
    if (holds(article)) {
      return article;
    }
  }
  throw new Error(`aucun article du corpus ne porte ${what} : le test ne vérifierait rien`);
};

const holding = async (kind: Article['blocks'][number]['type']): Promise<Article> =>
  first(`un bloc ${kind}`, (article) => article.blocks.some((block) => block.type === kind));

/**
 * Most paragraphs of the corpus are one run long, so an article picked for holding a paragraph would pass a renderer
 * that dropped every run but the first. This one is picked for holding a sentence made of several.
 */
const holdingSeveralRuns = async (): Promise<Article> =>
  first('un paragraphe de plusieurs fragments', (article) =>
    article.blocks.some((block) => block.type === 'paragraph' && block.spans.length > 1),
  );

describe('ArticleReader', () => {
  /**
   * An article opened from a search, from a shelf of kept pieces or from a link inside another article arrived with
   * nothing saying which part of the paper it came from. The word is the screen's to supply — the sections belong to
   * another entity — and it is asked for the section the article itself declares.
   */
  it('nomme au-dessus du titre la rubrique où l’article a paru', async () => {
    const article = await first('n’importe quel article', () => true);
    await read(article);
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.getByText(SECTION)).toBeTruthy();
  });

  it('rend le titre, le chapô et chaque fragment de chaque paragraphe', async () => {
    const article = await holdingSeveralRuns();
    await read(article);
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.getByText(article.standfirst)).toBeTruthy();
    const words = article.blocks.flatMap((block) =>
      block.type === 'paragraph' ? block.spans.map((span) => ('value' in span ? span.value : span.text)) : [],
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
    const crosshead = article.blocks.find((block) => block.type === 'heading');
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
    const article = await first(
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
    expect(order.indexOf(`Par ${signature}`)).toBeGreaterThan(order.indexOf(article.standfirst));
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
   * Nielsen's homepage guideline both ways round: a front page of one week's stories needs no date on each card, and
   * the full article needs one printed prominently. The cards lost theirs; this is where the paper says the day.
   */
  it('date l’article en toutes lettres, la seule date que le journal écrive ainsi', async () => {
    const article = await holding('paragraph');
    await read(article);
    expect(await screen.findByText(formatLongDate(article.publishedAt))).toBeTruthy();
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
    const related = article.blocks.find((block) => block.type === 'related');
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
    const related = article.blocks.find((block) => block.type === 'related');
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

  it('porte la durée de la vidéo, la seule chose que le contrat en dise avec son titre', async () => {
    const article = await holding('video');
    const video = article.blocks.find((block) => block.type === 'video');
    if (video === undefined) {
      throw new Error('bloc vidéo introuvable');
    }
    await read(article);
    expect(await screen.findByText(video.title)).toBeTruthy();
    const minutes = Math.floor(video.durationSeconds / 60);
    expect(screen.getByText(new RegExp(`^${String(minutes)}:`, 'u'))).toBeTruthy();
  });

  /**
   * Le gabarit sombre de l’article vidéo n’est pas une règle à part : c’est le thème sombre posé sur le sous-arbre.
   * La couleur du titre le dit, et c’est la seule chose qu’un rendu hors écran puisse en observer. Les deux valeurs
   * sont celles des captures : blanc sur la 11, le rouge de l’interface sur la 13. Le nuancier est lu plutôt que les
   * thèmes, qu’un fichier hors du noyau du thème n’a pas le droit d’importer.
   */
  it('pose l’article vidéo sur le thème sombre, et les autres sur celui du lecteur', async () => {
    const video = await holding('video');
    await read(video);
    const dark: unknown = (await screen.findByText(video.title)).props['style'];
    expect(dark).toMatchObject({ color: PALETTE.white });

    const written = await holding('image');
    await read(written);
    const light: unknown = (await screen.findByText(written.title)).props['style'];
    expect(light).toMatchObject({ color: PALETTE.uiRed });
  });

  /**
   * The capture shows an appeal with nothing to press, which the reference document counts as a fault. Showing a
   * button is not enough to have fixed it: a button that is drawn and answers nothing is the same fault, wearing the
   * shape of its repair. So the press is what the test makes, and the word carried up is what it reads.
   */
  it('donne à l’encart de soutien un bouton qui répond, que la capture n’en montre pas', async () => {
    const article = await holding('callout');
    const callout = article.blocks.find((block) => block.type === 'callout');
    if (callout === undefined) {
      throw new Error('encart introuvable');
    }
    const support = jest.fn();
    await read(article, () => undefined, support);
    expect(await screen.findByText(callout.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(callout.button));
    expect(support).toHaveBeenCalledTimes(1);
  });
});
