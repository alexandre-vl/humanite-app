import { create } from 'zustand';
import { isRecord } from '@huma/unknown';
import { openSpeech } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { createListening, EMPTY_LISTENING } from './controller';
import type { Listening, Resume } from './controller';

export const useListening = create<Listening>(() => EMPTY_LISTENING);

const restored = (): Resume | null => {
  const stored = storage.getString(STORAGE_KEYS.listening);
  if (stored === undefined) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(stored);
    if (
      !isRecord(data) ||
      data['version'] !== 2 ||
      typeof data['key'] !== 'string' ||
      typeof data['seconds'] !== 'number'
    ) {
      return null;
    }
    if (!Number.isFinite(data['seconds']) || data['seconds'] < 0) {
      return null;
    }
    return { key: data['key'], seconds: data['seconds'] };
  } catch {
    return null;
  }
};
let saved = '';
let audio: ReturnType<typeof import('#lib/audio').createAudioSession> | null = null;
let audioVersion = 0;
export const listening = createListening(
  {
    consented: () => storage.getString(STORAGE_KEYS.audioConsent) === 'yes',
    engine: async (article) => {
      storage.set(STORAGE_KEYS.audioConsent, 'yes');
      return Promise.resolve(openSpeech(article.id));
    },
    releaseAudio: () => {
      audioVersion += 1;
      audio?.close();
      audio = null;
    },
    player: async (recording, title, update) => {
      const version = audioVersion;
      const { createAudioSession } = await import('#lib/audio');
      if (version !== audioVersion) {
        throw new Error('Audio session cancelled');
      }
      audio ??= createAudioSession();
      return audio.open(recording, title, update);
    },
    resume: restored,
    remember: (resume) => {
      const next = JSON.stringify({ version: 2, ...resume, seconds: Math.floor(resume.seconds) });
      if (next !== saved) {
        storage.set(STORAGE_KEYS.listening, next);
        saved = next;
      }
    },
  },
  (state) => {
    useListening.setState(state, true);
  },
);
