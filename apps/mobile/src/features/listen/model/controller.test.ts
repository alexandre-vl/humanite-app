import { describe, expect, it, jest } from '@jest/globals';
import { content } from '#api';
import { firstArticle } from '#lib/testing';
import type { SpeechProgress, SpeechSession } from '#api';
import { createListening, EMPTY_LISTENING, readingKey } from './controller';
import type { Listening, ListeningPorts, Playback, Resume } from './controller';

const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};
const article = async () => firstArticle(content, 'un article ouvert', (each) => each.body.kind === 'open');
const passages = [
  { text: 'Le titre.', heading: true },
  { text: 'Un paragraphe entier.', heading: false },
];
const progress: SpeechProgress = {
  complete: true,
  duration: 40,
  cues: [
    { index: 0, start: 0 },
    { index: 1, start: 8 },
  ],
};
function bench(overrides: Partial<ListeningPorts> = {}) {
  let state: Listening = EMPTY_LISTENING;
  let resume: Resume | null = null;
  const callbacks: ((status: Playback) => void)[] = [];
  const play = jest.fn<() => void>();
  const pause = jest.fn<() => void>();
  const seek = jest.fn<(seconds: number) => Promise<void>>().mockResolvedValue(undefined);
  const close = jest.fn<() => void>();
  const sessionClose = jest.fn<() => void>();
  const open = jest.fn<SpeechSession['open']>().mockImplementation(async (blocks, signal, update) => {
    update(progress);
    return Promise.resolve('stream.m3u8');
  });
  const player = jest.fn<ListeningPorts['player']>().mockImplementation(async (uri, title, update) => {
    callbacks.push(update);
    return Promise.resolve({ play, pause, seek, close, rate: () => undefined });
  });
  const engine = jest.fn<ListeningPorts['engine']>().mockResolvedValue({ open, close: sessionClose });
  const listening = createListening(
    {
      consented: () => true,
      engine,
      player,
      releaseAudio: () => undefined,
      resume: () => resume,
      remember: (value) => {
        resume = value;
      },
      ...overrides,
    },
    (value) => {
      state = value;
    },
  );
  const status = (patch: Partial<Playback> = {}): void => {
    callbacks.at(-1)?.({
      position: 2,
      duration: 40,
      playing: true,
      finished: false,
      loaded: true,
      buffering: false,
      error: false,
      ...patch,
    });
  };
  return {
    listening,
    state: () => state,
    callbacks,
    status,
    open,
    engine,
    player,
    play,
    pause,
    seek,
    close,
    sessionClose,
  };
}

describe('continuous listening lifecycle', () => {
  it('requires consent and ignores duplicate starts while opening', async () => {
    const b = bench({ consented: () => false });
    b.listening.select(await article(), passages);
    expect(b.engine).not.toHaveBeenCalled();
    b.listening.begin();
    b.listening.begin();
    await flush();
    expect(b.open).toHaveBeenCalledTimes(1);
    expect(b.play).toHaveBeenCalledTimes(1);
    expect(b.state().stage).toBe('preparing');
    b.status();
    expect(b.state().stage).toBe('playing');
    b.listening.stop();
  });
  it('crosses a paragraph boundary without reloading or pausing the player', async () => {
    const b = bench();
    b.listening.select(await article(), passages);
    await flush();
    b.status({ position: 7.9 });
    b.status({ position: 8.1 });
    expect(b.state().index).toBe(1);
    expect(b.player).toHaveBeenCalledTimes(1);
    expect(b.pause).not.toHaveBeenCalled();
    expect(b.close).not.toHaveBeenCalled();
    b.listening.stop();
  });
  it('seeks on the article timeline across paragraph boundaries', async () => {
    const b = bench();
    b.listening.select(await article(), passages);
    await flush();
    b.status({ position: 7 });
    b.listening.seek(22);
    await flush();
    expect(b.seek).toHaveBeenCalledWith(22);
    b.listening.jump(1);
    expect(b.seek).toHaveBeenLastCalledWith(8);
    b.listening.stop();
  });
  it('keeps a pause requested during authorization', async () => {
    const pending = Promise.withResolvers<SpeechSession>();
    const b = bench({ engine: async () => pending.promise });
    b.listening.select(await article(), passages);
    b.listening.toggle();
    pending.resolve({ open: b.open, close: b.sessionClose });
    await flush();
    expect(b.play).not.toHaveBeenCalled();
    expect(b.state().stage).toBe('paused');
    b.listening.stop();
  });
  it('does not mistake buffering for a user pause and follows native media commands', async () => {
    const b = bench();
    b.listening.select(await article(), passages);
    await flush();
    b.status();
    b.status({ playing: false, buffering: true });
    expect(b.state().stage).toBe('preparing');
    b.status();
    expect(b.state().stage).toBe('playing');
    b.status({ playing: false });
    expect(b.state().stage).toBe('paused');
    b.status();
    expect(b.state().stage).toBe('playing');
    b.listening.stop();
  });
  it('rejects late sessions and stale native events after stop or article change', async () => {
    const pending = Promise.withResolvers<SpeechSession>();
    const b = bench({ engine: async () => pending.promise });
    b.listening.select(await article(), passages);
    b.listening.stop();
    pending.resolve({ open: b.open, close: b.sessionClose });
    await flush();
    expect(b.sessionClose).toHaveBeenCalledTimes(1);
    expect(b.player).not.toHaveBeenCalled();
    expect(b.state().stage).toBe('idle');
  });
  it('restores only the same content and closes on native errors', async () => {
    const item = await article();
    const key = readingKey(item, passages);
    const b = bench({ resume: () => ({ key, seconds: 12 }) });
    b.listening.select(item, passages);
    await flush();
    expect(b.seek).toHaveBeenCalledWith(12);
    b.status({ error: true });
    expect(b.state().stage).toBe('failed');
    expect(b.sessionClose).toHaveBeenCalledTimes(1);
    b.status();
    expect(b.state().stage).toBe('failed');
    b.listening.stop();
  });
  it('never starts audio for a withheld body', async () => {
    const item = await firstArticle(content, 'un corps retenu', (each) => each.body.kind === 'withheld');
    const b = bench();
    b.listening.select(item, passages);
    expect(b.engine).not.toHaveBeenCalled();
  });
  it('waits for a saved position to be generated before seeking and playing', async () => {
    const item = await article();
    const key = readingKey(item, passages);
    const b = bench({ resume: () => ({ key, seconds: 25 }) });
    b.open.mockImplementation(async (blocks, signal, update) => {
      update({ complete: false, duration: 5, cues: [{ index: 0, start: 0 }] });
      return Promise.resolve('stream.m3u8');
    });
    b.listening.select(item, passages);
    await flush();
    expect(b.seek).not.toHaveBeenCalled();
    expect(b.play).not.toHaveBeenCalled();
    b.open.mock.calls[0]?.[2](progress);
    await flush();
    expect(b.seek).toHaveBeenCalledWith(25);
    expect(b.play).toHaveBeenCalledTimes(1);
    b.listening.stop();
  });
  it('cancels a pending saved-position wait without starting playback', async () => {
    const item = await article();
    const key = readingKey(item, passages);
    const b = bench({ resume: () => ({ key, seconds: 25 }) });
    b.open.mockImplementation(async (blocks, signal, update) => {
      update({ complete: false, duration: 5, cues: [{ index: 0, start: 0 }] });
      return Promise.resolve('stream.m3u8');
    });
    b.listening.select(item, passages);
    await flush();
    b.listening.stop();
    b.open.mock.calls[0]?.[2](progress);
    await flush();
    expect(b.play).not.toHaveBeenCalled();
    expect(b.seek).not.toHaveBeenCalled();
    expect(b.state().stage).toBe('idle');
  });
});
