import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createAudioSession } from './audio';

type NativeStatus = Readonly<{
  currentTime: number;
  duration: number;
  playing: boolean;
  didJustFinish: boolean;
  isLoaded: boolean;
}>;
const listeners = new Set<(status: NativeStatus) => void>();
const emit = (playing = false): void => {
  for (const listener of listeners) {
    listener({ currentTime: 0, duration: 5, playing, didJustFinish: false, isLoaded: true });
  }
};
const mockNative = {
  shouldCorrectPitch: false,
  addListener: (event: string, callback: (status: NativeStatus) => void) => {
    listeners.add(callback);
    return { remove: () => listeners.delete(callback) };
  },
  replace: jest.fn<(source: { uri: string }) => void>(),
  play: jest.fn<() => void>(),
  pause: jest.fn<() => void>(),
  seekTo: jest.fn<(seconds: number) => Promise<void>>().mockResolvedValue(undefined),
  setPlaybackRate: jest.fn<(speed: number, quality: string) => void>(),
  setActiveForLockScreen: jest.fn<(active: boolean, metadata?: { title: string }, options?: object) => void>(),
  remove: jest.fn<() => void>(),
};
const mockCreate = jest.fn(() => mockNative);

jest.mock('expo-audio', () => ({
  createAudioPlayer: () => mockCreate(),
  setAudioModeAsync: async () => Promise.resolve(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  listeners.clear();
  mockNative.replace.mockImplementation(() => {
    queueMicrotask(() => {
      emit();
    });
  });
});

describe('native article audio session', () => {
  it('keeps the native player and lock-screen service across passages, then releases both on stop', async () => {
    const session = createAudioSession();
    const old = jest.fn();
    const next = jest.fn();
    const first = await session.open('first.wav', 'Article', old);
    first.play();
    first.close();
    const calls = old.mock.calls.length;
    expect(mockNative.remove).not.toHaveBeenCalled();
    const second = await session.open('next.wav', 'Article', next);
    second.play();
    emit(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockNative.replace).toHaveBeenNthCalledWith(2, { uri: 'next.wav' });
    expect(mockNative.setActiveForLockScreen).toHaveBeenCalledTimes(1);
    expect(old).toHaveBeenCalledTimes(calls);
    expect(next).toHaveBeenLastCalledWith({ position: 0, duration: 5, playing: true, finished: false, loaded: true });
    session.close();
    session.close();
    expect(mockNative.setActiveForLockScreen).toHaveBeenLastCalledWith(false);
    expect(mockNative.remove).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });
  it('settles a pending load on stop and never starts the released player', async () => {
    const loading = Promise.withResolvers<undefined>();
    mockNative.replace.mockImplementationOnce(() => {
      loading.resolve(undefined);
    });
    const session = createAudioSession();
    const opening = session.open('pending.wav', 'Article', jest.fn());
    await loading.promise;
    session.close();
    const closed = await opening;
    closed.play();
    expect(mockNative.play).not.toHaveBeenCalled();
    expect(mockNative.setActiveForLockScreen).not.toHaveBeenCalledWith(true, expect.anything(), expect.anything());
    expect(mockNative.remove).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });
  it('cancels before audio mode is configured without creating a native player', async () => {
    const session = createAudioSession();
    const opening = session.open('pending.wav', 'Article', jest.fn());
    session.close();
    await expect(opening).rejects.toThrow('Audio session closed');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
