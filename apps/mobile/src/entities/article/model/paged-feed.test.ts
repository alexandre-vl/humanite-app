import { ContentApiError, instantAt } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { focusManager } from '@tanstack/react-query';
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

/** A reading of the feed held open until the test lets it answer, with what it answers. */
const heldOpen = (): Readonly<{ answer: () => Promise<void>; asked: () => number }> => {
  let release: (() => void) | undefined;
  let asked = 0;
  const original = content.getFeed.bind(content);
  jest.spyOn(content, 'getFeed').mockImplementation(async (query) => {
    asked += 1;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return original(query);
  });
  return {
    answer: async () => {
      await act(async () => {
        release?.();
        await Promise.resolve();
      });
    },
    asked: () => asked,
  };
};

describe('usePagedFeed', () => {
  /**
   * The library reads a stale page again by itself when the app comes back to the front, on every list the app holds.
   * The platform's spinner was told to turn for those too: it turned at the top of the wire for a reader who had
   * pulled nothing, for as long as every page took to read again (iPhone simulator, 25/09/2026).
   */
  it('ne fait pas tourner l’indicateur de rafraîchissement quand la bibliothèque relit d’elle-même', async () => {
    const { result } = await renderHookWithCache(() => usePagedFeed(feedQuery));
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });
    const reading = heldOpen();
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(reading.asked()).toBe(1);
    });
    // The render that follows the reading setting off, which is the one that would turn the spinner.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(result.current.refreshing).toBe(false);
    await reading.answer();
    focusManager.setFocused(undefined);
  });

  it('fait tourner l’indicateur tant que la relecture demandée n’a pas répondu, et l’arrête ensuite', async () => {
    const { result } = await renderHookWithCache(() => usePagedFeed(feedQuery));
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });
    const reading = heldOpen();
    await act(async () => {
      result.current.readAgain();
      await Promise.resolve();
    });
    expect(result.current.refreshing).toBe(true);
    await reading.answer();
    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
  });

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
