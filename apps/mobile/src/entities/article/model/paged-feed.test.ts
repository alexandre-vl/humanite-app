import { ContentApiError, instantAt } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, waitFor } from '@testing-library/react-native';
import { content } from '#api';
import { renderHookWithCache } from '#lib/testing';
import { feedQuery } from '../api/queries';
import { footOf, stateOf, usePagedFeed } from './paged-feed';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('stateOf', () => {
  it('fait d’une lecture réussie sans article une étagère vide, et non un chargement', () => {
    expect(stateOf('success', null)).toEqual({ kind: 'empty' });
  });

  it('distingue ce qui n’a pas répondu de ce qui a échoué, et nomme la cause de l’échec', () => {
    expect(stateOf('pending', null)).toEqual({ kind: 'pending' });
    expect(stateOf('error', new ContentApiError('offline', 'hors ligne'))).toEqual({
      kind: 'failed',
      failure: 'offline',
    });
  });

  /** An error nobody named is a read that could not be made into an answer, which is what `malformed` says. */
  it('range une erreur que le contenu n’a pas nommée sous une réponse illisible', () => {
    expect(stateOf('error', new TypeError('x is undefined'))).toEqual({ kind: 'failed', failure: 'malformed' });
  });
});

describe('footOf', () => {
  const day = instantAt('2026-09-24 00:00');
  const offline = new ContentApiError('offline', 'hors ligne');

  it('ne pose rien quand aucune suite n’est demandée', () => {
    expect(footOf({ fetching: false, failed: false, error: null }, day)).toEqual({ kind: 'none' });
  });

  it('nomme la cause d’une suite qui n’est pas venue', () => {
    expect(footOf({ fetching: false, failed: true, error: offline }, day)).toEqual({
      kind: 'failed',
      failure: 'offline',
    });
  });

  /** Asked again, the failed part is on its way while the reading still stands failed: the foot says what it is doing. */
  it('dit que la suite vient quand on la redemande après un échec', () => {
    expect(footOf({ fetching: true, failed: true, error: offline }, day)).toEqual({ kind: 'coming', day });
  });
});

describe('usePagedFeed', () => {
  /** Every feed read page by page says under its last item what became of the next page, and asks for it again. */
  it('dit au pied pourquoi la page suivante n’est pas venue, et qu’elle vient quand on la redemande', async () => {
    const { items } = await content.getFeed({});
    jest.spyOn(content, 'getFeed').mockResolvedValueOnce({ items, nextCursor: 'suite' });
    const { result } = await renderHookWithCache(() => usePagedFeed(feedQuery));
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });
    jest.mocked(content.getFeed).mockRejectedValueOnce(new ContentApiError('timeout', 'trop long'));
    await act(async () => {
      result.current.onEndReached?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.foot).toEqual({ kind: 'failed', failure: 'timeout' });
    });
    jest.mocked(content.getFeed).mockImplementationOnce(async () => new Promise(() => undefined));
    await act(async () => {
      result.current.onEndReached?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.foot).toEqual({ kind: 'coming', day: null });
    });
  });
});
