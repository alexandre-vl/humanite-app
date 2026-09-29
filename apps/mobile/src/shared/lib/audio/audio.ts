import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type Status = Readonly<{
  position: number;
  duration: number;
  playing: boolean;
  finished: boolean;
  loaded: boolean;
  buffering: boolean;
  error: boolean;
}>;
type Playback = Readonly<{
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => Promise<void>;
  rate: (speed: number) => void;
  close: () => void;
}>;

/** One native player and Android foreground service for the whole article, with native buffering across all generated passages. */
export function createAudioSession(): Readonly<{
  open: (uri: string, title: string, update: (status: Status) => void) => Promise<Playback>;
  close: () => void;
}> {
  let player: ReturnType<typeof createAudioPlayer> | null = null;
  let detach: (() => void) | null = null;
  let released = false;
  let active = false;
  const mode = setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  return {
    open: async (uri, title, update) => {
      await mode;
      if (released) {
        throw new Error('Audio session closed');
      }
      detach?.();
      player ??= createAudioPlayer(null, {
        updateInterval: 200,
        keepAudioSessionActive: true,
        preferredForwardBufferDuration: 20,
      });
      const native = player;
      native.shouldCorrectPitch = true;
      let closed = false;
      const isClosed = (): boolean => closed;
      let cancelLoad = (): void => undefined;
      const subscription = native.addListener('playbackStatusUpdate', (status) => {
        if (!closed) {
          update({
            position: status.currentTime,
            duration: status.duration,
            playing: status.playing,
            finished: status.didJustFinish,
            loaded: status.isLoaded,
            buffering: status.isBuffering,
            error: status.error !== null,
          });
        }
      });
      const close = (): void => {
        if (!closed) {
          closed = true;
          subscription.remove();
          cancelLoad();
          native.pause();
        }
      };
      detach = close;
      try {
        await new Promise<void>((resolve, reject) => {
          const loaded = native.addListener('playbackStatusUpdate', (status) => {
            if (status.error !== null) {
              clearTimeout(timeout);
              loaded.remove();
              reject(new Error('Native audio failed'));
            } else if (status.isLoaded) {
              finish();
            }
          });
          const timeout = setTimeout(() => {
            loaded.remove();
            reject(new Error('Audio file load timed out'));
          }, 15000);
          const finish = (): void => {
            clearTimeout(timeout);
            loaded.remove();
            resolve();
          };
          cancelLoad = finish;
          native.replace({ uri });
        });
        if (!isClosed() && !active) {
          native.setActiveForLockScreen(true, { title }, { showSeekBackward: true, showSeekForward: true });
          active = true;
        }
        return {
          play: () => {
            if (!closed) {
              native.play();
            }
          },
          pause: () => {
            if (!closed) {
              native.pause();
            }
          },
          seek: async (seconds) => {
            if (!closed) {
              await native.seekTo(seconds);
            }
          },
          rate: (speed) => {
            if (!closed) {
              native.setPlaybackRate(speed, 'high');
            }
          },
          close,
        };
      } catch (error) {
        close();
        throw error;
      }
    },
    close: () => {
      if (!released) {
        released = true;
        detach?.();
        player?.setActiveForLockScreen(false);
        player?.remove();
        player = null;
      }
    },
  };
}
