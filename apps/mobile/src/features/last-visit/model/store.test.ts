import type { Instant } from '@huma/contracts';
import { INSTANT } from '@huma/contracts';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { useLastVisit, useVisits, VISIT_GAP } from './store';

const EARLIER = INSTANT.parse('2026-09-25T06:00:00.000Z');
const LATER = INSTANT.parse('2026-09-25T09:30:00.000Z');

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.wireVisit) ?? 'null');

/** A disk holding `seen` as the newest item the wire showed, as the store writes it. */
const written = (seen: unknown): void => {
  storage.set(STORAGE_KEYS.wireVisit, JSON.stringify({ state: { seen }, version: 1 }));
};

beforeEach(() => {
  useVisits.setState({ seen: null, since: null, leftAt: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useVisits', () => {
  /** The app starts a visit when it starts: the line of this one is what the last one saw. */
  it('trace la ligne de la visite qui commence là où la précédente s’était arrêtée', async () => {
    written(EARLIER);
    await useVisits.persist.rehydrate();
    expect(useVisits.getState()).toMatchObject({ seen: EARLIER, since: EARLIER });
  });

  /** The line is kept for the whole visit: what arrives while the reader is there goes above it with the rest. */
  it('note le plus récent article montré sans déplacer la ligne de la visite en cours', () => {
    useVisits.setState({ seen: EARLIER, since: EARLIER });
    useVisits.getState().saw(LATER);
    expect(useVisits.getState()).toMatchObject({ seen: LATER, since: EARLIER });
    expect(onDisk()).toEqual({ state: { seen: LATER }, version: 1 });
  });

  it('ne recule jamais ce qui a été vu', () => {
    const { saw } = useVisits.getState();
    saw(LATER);
    saw(EARLIER);
    expect(useVisits.getState().seen).toBe(LATER);
  });

  /**
   * A reader who leaves to answer a message and comes back a minute later is still reading; one who comes back after
   * half an hour is on another visit, and the line moves down to what they had been shown.
   */
  it('ouvre une autre visite quand l’app revient après une demi-heure, et pas avant', () => {
    useVisits.setState({ seen: LATER, since: EARLIER });
    const { left, came } = useVisits.getState();
    left(0);
    came(VISIT_GAP - 1);
    expect(useVisits.getState().since).toBe(EARLIER);
    left(VISIT_GAP);
    came(2 * VISIT_GAP);
    expect(useVisits.getState().since).toBe(LATER);
  });

  /** An app that comes back without having been put away — a cold start answers `active` too — opens nothing. */
  it('n’ouvre rien quand l’app revient sans avoir été quittée', () => {
    useVisits.setState({ seen: LATER, since: EARLIER });
    useVisits.getState().came(10 * VISIT_GAP);
    expect(useVisits.getState().since).toBe(EARLIER);
  });

  /** A file on a phone is not a value the type system has ever seen: what is no instant is a first visit. */
  it('ne croit pas sur parole ce que le disque dit du dernier article vu', async () => {
    const readBack = async (seen: unknown): Promise<Instant | null> => {
      written(seen);
      await useVisits.persist.rehydrate();
      return useVisits.getState().since;
    };
    expect(await readBack('hier soir')).toBeNull();
    expect(await readBack(42)).toBeNull();
    expect(await readBack(LATER)).toBe(LATER);
  });
});

describe('useLastVisit', () => {
  /** A tab keeps its screen once opened: a wire refreshed behind another tab has shown the reader nothing. */
  it('ne note ce que le fil montre que tant qu’il est à l’écran', async () => {
    const { rerender } = await renderHook(({ shown }: Readonly<{ shown: boolean }>) => useLastVisit(LATER, shown), {
      initialProps: { shown: false },
    });
    expect(useVisits.getState().seen).toBeNull();
    await rerender({ shown: true });
    expect(useVisits.getState().seen).toBe(LATER);
  });

  /** Put away for half an hour, the app comes back on another visit, whose line is what the wire showed before. */
  it('ouvre une autre visite quand l’app revient après une demi-heure ailleurs', async () => {
    const heard: Parameters<typeof AppState.addEventListener>[1][] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((...[, listener]) => {
      heard.push(listener);
      return { remove: () => undefined };
    });
    const clock = jest.spyOn(Date, 'now').mockReturnValue(0);
    useVisits.setState({ seen: EARLIER, since: null });
    const { result } = await renderHook(() => useLastVisit(LATER, true));
    expect(result.current).toBeNull();
    const told = async (state: 'active' | 'background' | 'inactive'): Promise<void> => {
      await act(() => {
        for (const listener of heard) {
          listener(state);
        }
      });
    };
    await told('inactive');
    clock.mockReturnValue(VISIT_GAP);
    await told('active');
    expect(result.current).toBeNull();
    await told('background');
    clock.mockReturnValue(2 * VISIT_GAP);
    await told('active');
    expect(result.current).toBe(LATER);
  });
});
