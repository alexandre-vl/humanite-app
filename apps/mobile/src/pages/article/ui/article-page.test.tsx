import type { Article } from '@huma/contracts';
import { blocksOf } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { NEWSROOM } from '#config';
import { useBookmarks } from '#features/bookmark';
import { t } from '#i18n';
import { openExternal } from '#lib/routing';
import { everyArticle, renderWithCache, settle } from '#lib/testing';
import { ArticlePage } from './article-page';

// Both doubles are built inside their factory: jest hoists the calls above everything else in the file, so anything
// they read from outside would still be undefined when the screen first asks. The routing module keeps everything
// else it holds — the screen reads its own parameter through it, and the article route is built from it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({ id: mockRead.id }),
}));

jest.mock('#lib/routing', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('#lib/routing')>('#lib/routing'),
  openExternal: jest.fn(),
}));

/** The article the screen is asked for, set before each render and read back by the mocked route parameters. */
const mockRead: { id: string } = { id: '' };

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

const open = async (article: Article): Promise<void> => {
  mockRead.id = article.id;
  await renderWithCache(<ArticlePage />);
  await settle();
};

/** Every run of every paragraph of `article`, so a link can be found by the words it is written on. */
const linkWords = (article: Article, kind: 'article' | 'external'): string | null => {
  for (const block of blocksOf(article)) {
    if (block.type !== 'paragraph') {
      continue;
    }
    for (const span of block.spans) {
      if (span.type === 'link' && span.target.kind === kind) {
        return span.text;
      }
    }
  }
  return null;
};

beforeEach(() => {
  jest.mocked(router.replace).mockClear();
  jest.mocked(openExternal).mockClear();
  useBookmarks.setState({ kept: [] });
});

describe('ArticlePage', () => {
  it('remplace l’écran quand le lien mène à un autre article du journal', async () => {
    const article = await first('un lien vers un article', (each) => linkWords(each, 'article') !== null);
    const words = linkWords(article, 'article');
    if (words === null) {
      throw new Error('lien interne introuvable');
    }
    await open(article);
    await fireEvent.press(await screen.findByText(words));
    expect(jest.mocked(router.replace)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(openExternal)).not.toHaveBeenCalled();
  });

  /**
   * A link out of the paper used to do nothing at all: the screen read only the branch that names an article, and a
   * span the reader could press led nowhere. The corpus carries twelve of them, so the silence was reachable.
   */
  it('quitte l’app quand le lien mène hors du journal', async () => {
    const article = await first('un lien hors du journal', (each) => linkWords(each, 'external') !== null);
    const words = linkWords(article, 'external');
    if (words === null) {
      throw new Error('lien externe introuvable');
    }
    await open(article);
    await fireEvent.press(await screen.findByText(words));
    expect(jest.mocked(openExternal)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(router.replace)).not.toHaveBeenCalled();
  });

  it('ouvre la page d’abonnement du journal quand le lecteur répond à l’appel au soutien', async () => {
    const article = await first('un encart', (each) => blocksOf(each).some((block) => block.type === 'callout'));
    const callout = blocksOf(article).find((block) => block.type === 'callout');
    if (callout === undefined) {
      throw new Error('encart introuvable');
    }
    await open(article);
    await fireEvent.press(await screen.findByText(callout.button));
    expect(jest.mocked(openExternal)).toHaveBeenCalledWith(NEWSROOM.subscription);
  });

  /** The mark keeps what the shelf will show — the article's card, read off the article the screen opened. */
  it('garde l’article ouvert depuis sa barre, tel que sa carte le montre', async () => {
    const [article] = await everyArticle(content);
    if (article === undefined) {
      throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
    }
    await open(await content.getArticle(article.id));
    await fireEvent.press(await screen.findByLabelText(t('bookmark.add')));
    expect(useBookmarks.getState().kept).toEqual([article]);
  });
});
