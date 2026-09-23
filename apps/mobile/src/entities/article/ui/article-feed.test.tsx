import type { ArticleSummary } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { content } from '#api';
import { renderWithCache, settle, standfirstOf } from '#lib/testing';
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

/** The first article the content serves, which both rhythms show first. */
const firstOf = (items: readonly ArticleSummary[]): ArticleSummary => {
  const [first] = items;
  if (first === undefined) {
    throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
};

describe('ArticleFeed', () => {
  it('affiche les articles que le contenu sert', async () => {
    const first = firstOf(await served());
    await mounted('paper', () => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(await screen.findByText(standfirstOf(first))).toBeTruthy();
  });

  it('rapporte l’article pressé, sans naviguer lui-même', async () => {
    const first = firstOf(await served());
    const open = jest.fn();
    await mounted('paper', open);
    await fireEvent.press(await screen.findByText(first.title));
    expect(open).toHaveBeenCalledWith(first.id);
  });

  /**
   * A page of the paper and a list differ in the shapes they give their items, never in their order: the order is the
   * source's — a desk's front, a search's answers — and a feed shows it as it came, under either rhythm.
   */
  it('montre en tête d’une page comme d’une liste le premier article servi', async () => {
    const first = firstOf(await served());
    await mounted('paper', () => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
    await screen.unmount();
    await mounted('list', () => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
  });
});
