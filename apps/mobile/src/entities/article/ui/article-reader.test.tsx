import { describe, expect, it, jest } from '@jest/globals';
import type { Article } from '@huma/contracts';
import { PALETTE } from '@huma/design-tokens';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { ArticleReader } from './article-reader';

const read = async (article: Article, onFollow: () => void = () => undefined): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <ArticleReader id={article.id} onFollow={onFollow} />
    </QueryClientProvider>,
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

/** The first article of the corpus whose body satisfies `holds`, so a test never asserts on a shape by luck. */
const first = async (what: string, holds: (article: Article) => boolean): Promise<Article> => {
  const { items } = await content.getFeed({ limit: 100 });
  for (const summary of items) {
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

  it('signe l’article des noms de la rédaction, et non des identifiants', async () => {
    const article = await holding('paragraph');
    const roster = await content.getAuthors();
    const [signed] = article.authors;
    const signer = roster.find((author) => author.id === signed);
    if (signer === undefined) {
      throw new Error('l’article n’est signé de personne que la rédaction connaisse');
    }
    await read(article);
    expect(await screen.findByText(`Par ${signer.name}`, { exact: false })).toBeTruthy();
    expect(screen.queryByText(signer.id)).toBeNull();
  });

  it('annonce l’article lié par son titre, et le rapporte quand on le presse', async () => {
    const article = await holding('related');
    const related = article.blocks.find((block) => block.type === 'related');
    if (related === undefined) {
      throw new Error('bloc lié introuvable');
    }
    const target = await content.getArticle(related.id);
    const follow = jest.fn();
    await read(article, follow);
    expect(await screen.findByText('Sur le même thème')).toBeTruthy();
    await fireEvent.press(await screen.findByText(target.title));
    expect(follow).toHaveBeenCalledWith({ kind: 'article', id: related.id });
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

  it('donne un bouton à l’encart de soutien, que la capture n’en montre pas', async () => {
    const article = await holding('callout');
    const callout = article.blocks.find((block) => block.type === 'callout');
    if (callout === undefined) {
      throw new Error('encart introuvable');
    }
    await read(article);
    expect(await screen.findByText(callout.title)).toBeTruthy();
    expect(screen.getByText(callout.button)).toBeTruthy();
  });
});
