import type { Article } from '@huma/contracts';
import { blocksOf } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { PALETTE } from '@huma/design-tokens';
import { content } from '#api';
import { t } from '#i18n';
import { useViewingPicture } from '#features/view-picture';
import { useBookmarks } from '#features/bookmark';
import { openExternal } from '#lib/routing';
import { everyArticle, firstArticle, renderWithCache, settle, styleOf } from '#lib/testing';
import { ArticlePage } from './article-page';

// Both doubles are built inside their factory: jest hoists the calls above everything else in the file, so anything
// they read from outside would still be undefined when the screen first asks. The routing module keeps everything
// else it holds — the screen reads its own parameter through it.
jest.mock('expo-router', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const link = ({
    children,
    onPress,
  }: Readonly<{ children: import('react').ReactNode; onPress: () => void }>): import('react').ReactNode =>
    createElement(View, { onTouchEnd: onPress }, children);
  const zoom = ({ children }: Readonly<{ children: import('react').ReactNode }>): import('react').ReactNode => children;
  const Link = Object.assign(link, { AppleZoom: zoom });
  return {
    Link,
    __esModule: true,
    router: { back: jest.fn() },
    useLocalSearchParams: (): Readonly<Record<string, string>> => ({ id: mockRead.id }),
  };
});

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
  // A screen held on a reading that never answers is one test's setting and no other's: left standing, it hands the
  // next screen a service that says nothing and the failure lands on a test that never asked for it.
  jest.restoreAllMocks();
});

describe('ArticlePage', () => {
  it('transmet la photo au lien natif sans ouvrir une seconde modale', async () => {
    useViewingPicture.getState().clear();
    await open(
      await firstArticle(content, 'une photographie', (each) => each.format === 'article' && each.hero !== undefined),
    );
    const button = screen.getAllByRole('button', { name: t('picture.open') }).at(0);
    if (button === undefined) {
      throw new Error('Photographie introuvable');
    }
    await fireEvent(button, 'touchEnd');
    expect(useViewingPicture.getState().picture).not.toBeNull();
    expect(screen.queryByRole('button', { name: t('picture.close') })).toBeNull();
  });

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

  /**
   * The ground a video is read on comes with the card that opened it, not with the article. What an item is — a video,
   * a column, a piece of running coverage — is a field of every summary, so the app holds it before it has asked the
   * service anything. Read from the article alone, the page opened white and turned black under the reader when the
   * body landed: measured on the phone on 25/09/2026, 850 ms of a video read on the wrong ground, its head, its
   * standfirst and its signature already printed on it.
   */
  it('pose une vidéo sur le thème sombre dès l’ouverture, avant que le journal ait répondu', async () => {
    const video = await firstArticle(content, 'une vidéo', (each) => each.format === 'video');
    useBookmarks.setState({ kept: [video] });
    jest.spyOn(content, 'getArticle').mockReturnValue(new Promise<Article>(() => undefined));
    await open(video);
    expect(styleOf(await screen.findByText(video.title))).toMatchObject({ color: PALETTE.white });
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
