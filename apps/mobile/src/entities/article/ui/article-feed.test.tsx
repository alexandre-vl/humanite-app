import type { ArticleSummary } from '@huma/contracts';
import { isList, isRecord } from '@huma/unknown';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { content } from '#api';
import { t } from '#i18n';
import { renderWithCache, settle, standfirstOf } from '#lib/testing';
import { feedQuery } from '../api/queries';
import { feedOf, usePagedFeed } from '../model/paged-feed';
import type { FeedRhythm } from '../model/rhythm';
import { Text } from '#primitives/text';
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

/** The words the screen lays out, in the order a reader meets them. */
const inOrder = (): readonly string[] => {
  const met: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      met.push(node);
    } else if (isList(node)) {
      for (const child of node) {
        walk(child);
      }
    } else if (isRecord(node)) {
      walk(node['children']);
    }
  };
  walk(screen.toJSON());
  return met;
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

  /**
   * A next page that failed left the reader at the last item: the list asks again only once it has grown, and a failed
   * page grows nothing. The feed says why under that item, and asking again from there asks for the page again.
   */
  it('dit sous le dernier article pourquoi la suite n’est pas venue, et la redemande', async () => {
    const items = await served();
    const onEndReached = jest.fn();
    const feed = { ...feedOf(items), onEndReached, foot: { kind: 'failed', failure: 'offline' } } as const;
    await renderWithCache(<ArticleFeed feed={feed} rhythm="list" onOpen={() => undefined} />);
    await settle();
    expect(screen.getByText('Pas de connexion')).toBeTruthy();
    // The list itself asks as it lays out a page shorter than four of its frames: the press is what is counted.
    onEndReached.mockClear();
    await fireEvent.press(screen.getByText(t('action.retry')));
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  /**
   * The notice is a row of the list, above the first card: laid over the list, it pushed every card down under a
   * reader already reading the moment it arrived.
   */
  it('pose la notice de l’écran au-dessus de sa première carte', async () => {
    const items = await served();
    const first = firstOf(items);
    await renderWithCache(
      <ArticleFeed
        feed={feedOf(items)}
        rhythm="paper"
        onOpen={() => undefined}
        notice={<Text>{t('feed.more')}</Text>}
      />,
    );
    await settle();
    const met = inOrder();
    expect(met.indexOf(t('feed.more'))).toBeGreaterThanOrEqual(0);
    expect(met.indexOf(t('feed.more'))).toBeLessThan(met.indexOf(first.title));
  });

  /** A feed with no card shows what stands in for them, and a notice over nothing would stand in its way. */
  it('ne pose aucune notice sur un fil qui n’a pas encore de carte', async () => {
    await renderWithCache(
      <ArticleFeed
        feed={{ ...feedOf([]), state: { kind: 'pending' } }}
        rhythm="paper"
        onOpen={() => undefined}
        notice={<Text>{t('feed.more')}</Text>}
      />,
    );
    await settle();
    expect(screen.queryByText(t('feed.more'))).toBeNull();
  });
});
