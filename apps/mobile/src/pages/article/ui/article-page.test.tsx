import type { Article } from '@huma/contracts';
import { blocksOf } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { PALETTE } from '@huma/design-tokens';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { t } from '#i18n';
import { openExternal } from '#lib/routing';
import { everyArticle, firstArticle, renderWithCache, settle, styleOf } from '#lib/testing';
import { ArticlePage } from './article-page';

// Both doubles are built inside their factory: jest hoists the calls above everything else in the file, so anything
// they read from outside would still be undefined when the screen first asks. The routing module keeps everything
// else it holds — the screen reads its own parameter through it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { back: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({ id: mockRead.id }),
}));

jest.mock('#lib/routing', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('#lib/routing')>('#lib/routing'),
  openExternal: jest.fn(),
}));

/** The article the screen is asked for, set before each render and read back by the mocked route parameters. */
const mockRead: { id: string } = { id: '' };

const open = async (article: Article): Promise<void> => {
  mockRead.id = article.id;
  await renderWithCache(<ArticlePage />);
  await settle();
};

/** The first link of a paragraph of `article`, so it can be pressed by the words it is written on. */
const firstLink = (article: Article): Readonly<{ text: string; url: string }> | null => {
  for (const block of blocksOf(article)) {
    if (block.type !== 'paragraph') {
      continue;
    }
    for (const span of block.spans) {
      if (span.type === 'link') {
        return span;
      }
    }
  }
  return null;
};

beforeEach(() => {
  jest.mocked(openExternal).mockClear();
  useBookmarks.setState({ kept: [] });
});

describe('ArticlePage', () => {
  /**
   * A link opens its page in the reader's browser, the one place the paper links to. A link out of the paper once did
   * nothing at all — the screen read only a branch that named an article — and the corpus carries twelve of them.
   */
  it('quitte l’app vers la page du lien', async () => {
    const article = await firstArticle(content, 'un lien', (each) => firstLink(each) !== null);
    const link = firstLink(article);
    if (link === null) {
      throw new Error('lien introuvable');
    }
    await open(article);
    await fireEvent.press(await screen.findByText(link.text));
    expect(jest.mocked(openExternal)).toHaveBeenCalledWith(link.url);
  });

  /**
   * A video is read on the dark page and every other piece on the reader's own, the bar over it included: the dark was
   * laid on the reading alone, and left a white bar over a black page. The headline's ink says which ground it is on —
   * white on the dark one, the paper's red on the light one — and the swatches are read rather than the themes, which a
   * file outside the theme's core may not import.
   */
  it('pose la page d’une vidéo sur le thème sombre, et les autres sur celui du lecteur', async () => {
    const video = await firstArticle(content, 'une vidéo', (each) => each.format === 'video');
    await open(video);
    expect(styleOf(await screen.findByText(video.title))).toMatchObject({ color: PALETTE.white });
    await screen.unmount();
    const written = await firstArticle(content, 'un article', (each) => each.format === 'article');
    await open(written);
    expect(styleOf(await screen.findByText(written.title))).toMatchObject({ color: PALETTE.uiRed });
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
