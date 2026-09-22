import type { ArticleSummary } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { content } from '#api';
import { renderWithCache, settle } from '#lib/testing';
import { feedQuery } from '../api/queries';
import { usePagedFeed } from '../model/paged-feed';
import type { FeedRhythm } from '../model/rhythm';
import { ArticleFeed } from './article-feed';

type ScreenProps = Readonly<{ rhythm: FeedRhythm; onOpen: (id: string) => void }>;

/** What a screen does with a feed, in miniature: it reads it, then hands it to the view that shows it. */
function Screen({ rhythm, onOpen }: ScreenProps): ReactNode {
  return <ArticleFeed feed={usePagedFeed(feedQuery)} rhythm={rhythm} onOpen={onOpen} />;
}

const mounted = async (rhythm: FeedRhythm, onOpen: (id: string) => void): Promise<void> => {
  await renderWithCache(<Screen rhythm={rhythm} onOpen={onOpen} />);
  await settle();
};

const served = async (): Promise<readonly ArticleSummary[]> => (await content.getFeed({})).items;

/** The first article served, and the first that carries a picture: on this corpus they are never the same one. */
const both = (items: readonly ArticleSummary[]): readonly [ArticleSummary, ArticleSummary] => {
  const [first] = items;
  const front = items.find((item) => item.hero !== undefined);
  if (first === undefined || front === undefined) {
    throw new Error('le contenu ne sert pas ce qu’il faut : le test ne vérifierait rien');
  }
  return [first, front];
};

describe('ArticleFeed', () => {
  it('affiche les articles que le contenu sert', async () => {
    const [first] = both(await served());
    await mounted('paper', () => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(await screen.findByText(first.standfirst)).toBeTruthy();
  });

  it('rapporte l’article pressé, sans naviguer lui-même', async () => {
    const [first] = both(await served());
    const open = jest.fn();
    await mounted('paper', open);
    await fireEvent.press(await screen.findByText(first.title));
    expect(open).toHaveBeenCalledWith(first.id);
  });

  /**
   * The two rhythms differ on the screen, not only in the model: a page of the paper puts its front first, and a
   * list answers in the order it was asked in. This is the only test that reads that off a mounted list.
   */
  it('monte la une en tête d’une page, et laisse une liste dans son ordre', async () => {
    const [first, front] = both(await served());
    expect(first.id).not.toBe(front.id);
    await mounted('paper', () => undefined);
    expect(await screen.findByText(front.title)).toBeTruthy();
    await screen.unmount();
    await mounted('list', () => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
  });
});
