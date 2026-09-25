import type { Instant } from '@huma/contracts';
import { INSTANT } from '@huma/contracts';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';
import { AppState } from 'react-native';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { useLastVisit, useVisits } from './store';

const EARLIER = INSTANT.parse('2026-09-25T06:00:00.000Z');
const LATER = INSTANT.parse('2026-09-25T09:30:00.000Z');
const NEWER = INSTANT.parse('2026-09-25T10:15:00.000Z');

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.wireVisit) ?? 'null');

/** A disk holding `seen` as the newest item the wire showed, as the store writes it. */
const written = (seen: unknown): void => {
  storage.set(STORAGE_KEYS.wireVisit, JSON.stringify({ state: { seen }, version: 1 }));
};

type Watched = Readonly<{ newest: Instant | null; shown: boolean }>;

/** The hook as the wire's screen holds it, on a wire showing `newest` and in front of the reader or not. */
const watch = async (initialProps: Watched) =>
  renderHook(({ newest, shown }: Watched) => useLastVisit(newest, shown), { initialProps });

beforeEach(() => {
  useVisits.setState({ seen: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useVisits', () => {
  it('reprend ce que le fil avait montré la dernière fois', async () => {
    written(EARLIER);
    await useVisits.persist.rehydrate();
    expect(useVisits.getState().seen).toBe(EARLIER);
  });

  it('note le plus récent article montré, et l’écrit', () => {
    useVisits.getState().saw(LATER);
    expect(useVisits.getState().seen).toBe(LATER);
    expect(onDisk()).toEqual({ state: { seen: LATER }, version: 1 });
  });

  it('ne recule jamais ce qui a été vu', () => {
    const { saw } = useVisits.getState();
    saw(LATER);
    saw(EARLIER);
    expect(useVisits.getState().seen).toBe(LATER);
  });

  /** A file on a phone is not a value the type system has ever seen: what is no instant is a first visit. */
  it('ne croit pas sur parole ce que le disque dit du dernier article vu', async () => {
    const readBack = async (seen: unknown): Promise<Instant | null> => {
      written(seen);
      await useVisits.persist.rehydrate();
      return useVisits.getState().seen;
    };
    expect(await readBack('hier soir')).toBeNull();
    expect(await readBack(42)).toBeNull();
    expect(await readBack(LATER)).toBe(LATER);
  });
});

describe('useLastVisit', () => {
  /** A tab keeps its screen once opened: a wire refreshed behind another tab has shown the reader nothing. */
  it('ne note ce que le fil montre que tant qu’il est à l’écran', async () => {
    const { rerender } = await watch({ newest: LATER, shown: false });
    expect(useVisits.getState().seen).toBeNull();
    await rerender({ newest: LATER, shown: true });
    expect(useVisits.getState().seen).toBe(LATER);
  });

  /** What arrives while the reader is there is new with the rest: the look is the one they came with. */
  it('dit nouveau ce qui est paru depuis le dernier regard, et le garde tant que le lecteur reste', async () => {
    useVisits.setState({ seen: EARLIER });
    const { result, rerender } = await watch({ newest: LATER, shown: true });
    expect(result.current.since).toBe(EARLIER);
    expect(useVisits.getState().seen).toBe(LATER);
    await rerender({ newest: NEWER, shown: true });
    expect(result.current.since).toBe(EARLIER);
    expect(useVisits.getState().seen).toBe(NEWER);
  });

  /** The line that stayed put after a turn to another tab and back, on 25/09/2026. */
  it('ne dit plus nouveau ce qui l’était, une fois le lecteur parti et revenu', async () => {
    useVisits.setState({ seen: EARLIER });
    const { result, rerender } = await watch({ newest: LATER, shown: true });
    await rerender({ newest: LATER, shown: false });
    expect(result.current.since).toBe(EARLIER);
    await rerender({ newest: LATER, shown: true });
    expect(result.current.since).toBe(LATER);
  });

  /** Refreshed while the reader was elsewhere, the wire has items they have not seen: those are new when they come. */
  it('dit nouveau ce qui est arrivé pendant que le lecteur était ailleurs', async () => {
    useVisits.setState({ seen: EARLIER });
    const { result, rerender } = await watch({ newest: LATER, shown: true });
    await rerender({ newest: LATER, shown: false });
    await rerender({ newest: NEWER, shown: false });
    await rerender({ newest: NEWER, shown: true });
    expect(result.current.since).toBe(LATER);
  });

  it('regarde de nouveau quand le lecteur tire le fil pour le relire', async () => {
    useVisits.setState({ seen: EARLIER });
    const { result } = await watch({ newest: LATER, shown: true });
    await act(() => {
      result.current.lookAgain();
    });
    expect(result.current.since).toBe(LATER);
  });

  /**
   * React mounts a screen twice where it tests one, running its effects twice: a look taken in an effect was taken
   * again after the first had noted what the wire showed, and nothing on screen was ever new.
   */
  it('prend le même regard quand React monte l’écran deux fois', async () => {
    useVisits.setState({ seen: EARLIER });
    const { result } = await renderHook(() => useLastVisit(LATER, true), { wrapper: StrictMode });
    expect(result.current.since).toBe(EARLIER);
    expect(useVisits.getState().seen).toBe(LATER);
  });

  /** Coming back to the app is looking again; being covered for a moment by a call or the notification centre is not. */
  it('regarde de nouveau quand l’app revient après avoir été quittée, et pas avant', async () => {
    const heard: Parameters<typeof AppState.addEventListener>[1][] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((...[, listener]) => {
      heard.push(listener);
      return { remove: () => undefined };
    });
    useVisits.setState({ seen: EARLIER });
    const { result } = await watch({ newest: LATER, shown: true });
    const told = async (state: 'active' | 'background' | 'inactive'): Promise<void> => {
      await act(() => {
        for (const listener of heard) {
          listener(state);
        }
      });
    };
    await told('inactive');
    await told('active');
    expect(result.current.since).toBe(EARLIER);
    await told('background');
    await told('active');
    expect(result.current.since).toBe(LATER);
  });
});
