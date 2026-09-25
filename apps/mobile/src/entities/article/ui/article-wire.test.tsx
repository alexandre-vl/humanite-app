import { instantAt } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { ancestorsOf, renderWithCache, settle, styleOf } from '#lib/testing';
import type { Rendered } from '#lib/testing';
import { feedOf } from '../model/paged-feed';
import { ArticleWire } from './article-wire';

/** Whether `node` lays a line of the wire: beside what it holds, the column the dashed thread runs down. */
const threaded = (node: Rendered): boolean =>
  node.children.some(
    (column) =>
      typeof column !== 'string' &&
      column.children.some((inner) => typeof inner !== 'string' && styleOf(inner)['borderStyle'] === 'dashed'),
  );

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ArticleWire', () => {
  /**
   * The foot stood at the edge of the list once, the thread ending over it and its words starting under the thread
   * rather than where every title starts (iPhone simulator, 25/09/2026). It hangs from the thread now, as a row does.
   */
  it('pend son pied au fil, comme une ligne', async () => {
    const { items } = await content.getLiveFeed({});
    const feed = { ...feedOf(items), foot: { kind: 'coming', day: null } } as const;
    await renderWithCache(<ArticleWire feed={feed} onOpen={() => undefined} />);
    await settle();
    expect(ancestorsOf(screen.getByText(t('feed.more'))).some(threaded)).toBe(true);
  });

  /**
   * Under its last row the wire says which day is on its way, and the reader who reaches the end reads it there. Read
   * on the evening of the 25th, which is what the day on its way is named against: the day before would be « hier ».
   */
  it('nomme sous sa dernière ligne la journée en route', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-25T19:00:00.000Z'));
    const { items } = await content.getLiveFeed({});
    const feed = { ...feedOf(items), foot: { kind: 'coming', day: instantAt('2026-09-23 00:00') } } as const;
    await renderWithCache(<ArticleWire feed={feed} onOpen={() => undefined} />);
    await settle();
    expect(screen.getByText('Chargement du mercredi 23\u00A0septembre\u00A0…')).toBeTruthy();
  });

  it('dit sous sa dernière ligne pourquoi la suite n’est pas venue, et la redemande', async () => {
    const { items } = await content.getLiveFeed({});
    const onEndReached = jest.fn();
    const feed = { ...feedOf(items), onEndReached, foot: { kind: 'failed', failure: 'timeout' } } as const;
    await renderWithCache(<ArticleWire feed={feed} onOpen={() => undefined} />);
    await settle();
    expect(screen.getByText('Le journal tarde à répondre')).toBeTruthy();
    // The list itself asks as it lays out a run shorter than four of its frames: the press is what is counted.
    onEndReached.mockClear();
    await fireEvent.press(screen.getByText(t('action.retry')));
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });
});
