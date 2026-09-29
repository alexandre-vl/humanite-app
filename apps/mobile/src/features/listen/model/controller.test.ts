import { describe, expect, it, jest } from '@jest/globals';
import { content } from '#api';
import { firstArticle } from '#lib/testing';
import type { SpeechSession } from '#api';
import { createListening, EMPTY_LISTENING, readingKey } from './controller';
import type { Listening, ListeningPorts, Playback, Resume } from './controller';

const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};
const article = async () => firstArticle(content, 'un article ouvert', (each) => each.body.kind === 'open');
const passages = [
  { text: 'Le premier passage.', heading: true },
  { text: 'Le deuxième passage.', heading: false },
  { text: 'Le dernier passage.', heading: false },
];
function bench(overrides: Partial<ListeningPorts> = {}) {
  let state: Listening = EMPTY_LISTENING;
  let resume: Resume | null = null;
  const callbacks: ((status: Playback) => void)[] = [];
  const players: {
    play: ReturnType<typeof jest.fn<() => void>>;
    close: ReturnType<typeof jest.fn<() => void>>;
    seek: ReturnType<typeof jest.fn<(seconds: number) => Promise<void>>>;
  }[] = [];
  const speak = jest.fn<SpeechSession['speak']>().mockResolvedValue({ uri: 'audio.wav', duration: 20 });
  const close = jest.fn<SpeechSession['close']>().mockResolvedValue(undefined);
  const engine = jest.fn<ListeningPorts['engine']>().mockResolvedValue({ speak, close });
  const clear = jest.fn<() => void>();
  const releaseAudio = jest.fn<() => void>();
  const listening = createListening(
    {
      consented: () => true,
      engine,
      clear,
      releaseAudio,
      player: async (recording, title, callback) => {
        const player = {
          play: jest.fn<() => void>(),
          pause: jest.fn<() => void>(),
          close: jest.fn<() => void>(),
          seek: jest.fn<(seconds: number) => Promise<void>>().mockResolvedValue(undefined),
          rate: jest.fn<(speed: number) => void>(),
        };
        callbacks.push(callback);
        players.push(player);
        return Promise.resolve(player);
      },
      resume: () => resume,
      remember: (next) => {
        resume = next;
      },
      ...overrides,
    },
    (next) => {
      state = next;
    },
  );
  const status = (patch: Partial<Playback> = {}): void => {
    callbacks.at(-1)?.({ position: 2, duration: 20, playing: true, finished: false, loaded: true, ...patch });
  };
  return {
    listening,
    state: () => state,
    speak,
    close,
    engine,
    clear,
    releaseAudio,
    players,
    callbacks,
    status,
  };
}

describe('article listening session', () => {
  it('asks once before sending text to the server and ignores navigation until the engine is ready', async () => {
    const b = bench({ consented: () => false });
    b.listening.select(await article(), passages);
    b.listening.jump(2);
    b.listening.expand(false);
    b.listening.toggle();
    expect(b.state().stage).toBe('intro');
    expect(b.state().expanded).toBe(true);
    expect(b.engine).not.toHaveBeenCalled();
    b.listening.begin();
    b.listening.begin();
    await flush();
    expect(b.engine).toHaveBeenCalledTimes(1);
    expect(b.state().stage).toBe('playing');
    expect(b.speak).toHaveBeenCalledTimes(3);
    b.listening.stop();
  });
  it('never saves or plays a generation that completed after stop', async () => {
    const pending = Promise.withResolvers<{ uri: string; duration: number }>();
    const speak = jest.fn<SpeechSession['speak']>().mockReturnValue(pending.promise);
    const close = jest.fn<SpeechSession['close']>().mockResolvedValue(undefined);
    const b = bench({ engine: async () => Promise.resolve({ speak, close }) });
    b.listening.select(await article(), passages);
    await flush();
    b.listening.stop();
    pending.resolve({ uri: 'audio.wav', duration: 20 });
    await flush();
    expect(b.state().prepared).toBe(0);
    expect(b.players).toHaveLength(0);
    expect(close).toHaveBeenCalledTimes(1);
    expect(b.state().stage).toBe('idle');
  });
  it('ignores a cancelled session when another article has been selected', async () => {
    const first = Promise.withResolvers<SpeechSession>();
    const engine = jest
      .fn<ListeningPorts['engine']>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({
        speak: async () => Promise.resolve({ uri: 'audio.wav', duration: 20 }),
        close: async () => Promise.resolve(),
      });
    const b = bench({ engine });
    const item = await article();
    b.listening.select(item, passages);
    b.listening.select(item, [{ text: 'Le texte corrigé.', heading: false }]);
    await flush();
    first.reject(new Error('cancelled'));
    await flush();
    expect(b.state().stage).toBe('playing');
    expect(b.state().passages[0]?.text).toBe('Le texte corrigé.');
    expect(b.state().prepared).toBe(1);
    b.listening.stop();
  });
  it('keeps a pause during generation and resumes with no second synthesis', async () => {
    const pending = Promise.withResolvers<{ uri: string; duration: number }>();
    const speak = jest
      .fn<SpeechSession['speak']>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ uri: 'audio.wav', duration: 20 });
    const b = bench({ engine: async () => Promise.resolve({ speak, close: async () => Promise.resolve() }) });
    b.listening.select(await article(), passages);
    await flush();
    b.listening.toggle();
    pending.resolve({ uri: 'audio.wav', duration: 20 });
    await flush();
    expect(b.state().stage).toBe('paused');
    expect(b.players[0]?.play).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    b.listening.toggle();
    await flush();
    expect(b.players[0]?.play).toHaveBeenCalledTimes(1);
    b.listening.stop();
  });
  it('tracks native pause and resume, advances once, and ignores the previous player', async () => {
    const b = bench();
    b.listening.select(await article(), passages);
    await flush();
    b.status();
    b.status({ playing: false });
    expect(b.state().stage).toBe('paused');
    b.status();
    expect(b.state().stage).toBe('playing');
    const old = b.callbacks[0];
    b.status({ finished: true });
    await flush();
    expect(b.state().index).toBe(1);
    expect(b.players[1]?.play).toHaveBeenCalledTimes(1);
    expect(b.releaseAudio).toHaveBeenCalledTimes(1);
    old?.({ position: 20, duration: 20, playing: false, finished: true, loaded: true });
    expect(b.state().index).toBe(1);
    b.listening.stop();
    expect(b.releaseAudio).toHaveBeenCalledTimes(2);
  });
  it('restores a position only for the same words and seeks before playback', async () => {
    const item = await article();
    const key = readingKey(item, passages);
    const b = bench({ resume: () => ({ key, index: 1, seconds: 8 }) });
    b.listening.select(item, passages);
    await flush();
    expect(b.state().index).toBe(1);
    expect(b.players[0]?.seek).toHaveBeenCalledWith(8);
    b.listening.stop();
    b.listening.select(item, [{ text: 'Un article corrigé.', heading: false }]);
    await flush();
    expect(b.state().index).toBe(0);
    expect(b.state().position).toBe(0);
    b.listening.stop();
  });
  it('retries a failed connection without losing the selected article', async () => {
    const engine = jest
      .fn<ListeningPorts['engine']>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        speak: async () => Promise.resolve({ uri: 'audio.wav', duration: 20 }),
        close: async () => Promise.resolve(),
      });
    const b = bench({ engine });
    b.listening.select(await article(), passages);
    await flush();
    expect(b.state().error).toBe('speech');
    b.listening.begin();
    await flush();
    expect(b.state().stage).toBe('playing');
    expect(b.state().error).toBeNull();
    b.listening.stop();
  });
  it('cannot start audio for a withheld article', async () => {
    const item = await firstArticle(content, 'un article réservé', (each) => each.body.kind === 'withheld');
    const b = bench();
    b.listening.select(item, passages);
    await flush();
    expect(b.engine).not.toHaveBeenCalled();
    expect(b.state().article).toBeNull();
  });
});
