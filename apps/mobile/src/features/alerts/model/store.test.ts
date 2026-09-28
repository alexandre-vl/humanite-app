import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ALERTS } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { resumeAlerts, useAlerts } from './store';

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.alerts) ?? 'null');

/** What a disk would hold, so a rehydration can be made to read it. */
const writeDisk = async (state: unknown): Promise<void> => {
  storage.set(STORAGE_KEYS.alerts, JSON.stringify({ state, version: 1 }));
  await useAlerts.persist.rehydrate();
};

// The store is one module and outlives a test, so each starts where a phone that never chose starts: nothing wanted,
// nothing asked, nothing refused.
beforeEach(() => {
  jest.restoreAllMocks();
  useAlerts.setState({ wanted: false, asking: false, blocked: false });
});

describe('useAlerts', () => {
  it('garde les alertes voulues une fois que le téléphone les permet, et l’écrit avec sa version', async () => {
    const subscribing = jest.spyOn(ALERTS, 'subscribe').mockResolvedValue(true);
    await useAlerts.getState().turnOn();
    expect(subscribing).toHaveBeenCalledTimes(1);
    expect(useAlerts.getState()).toMatchObject({ wanted: true, asking: false, blocked: false });
    expect(onDisk()).toEqual({ state: { wanted: true }, version: 1 });
  });

  it('ne garde rien d’un téléphone qui refuse de notifier, et dit qu’il refuse', async () => {
    jest.spyOn(ALERTS, 'subscribe').mockResolvedValue(false);
    await useAlerts.getState().turnOn();
    expect(useAlerts.getState()).toMatchObject({ wanted: false, asking: false, blocked: true });
    expect(onDisk()).toEqual({ state: { wanted: false }, version: 1 });
  });

  it('retombe éteint, et jamais « en cours », quand OneSignal n’a pas pu démarrer', async () => {
    jest.spyOn(ALERTS, 'subscribe').mockRejectedValue(new Error('module natif absent'));
    await useAlerts.getState().turnOn();
    expect(useAlerts.getState()).toMatchObject({ wanted: false, asking: false, blocked: false });
  });

  /** Two presses while the platform asks are one question: the second finds one under way and asks nothing. */
  it('ne pose pas une seconde fois la question que la plateforme pose déjà', async () => {
    const subscribing = jest.spyOn(ALERTS, 'subscribe').mockResolvedValue(true);
    const first = useAlerts.getState().turnOn();
    await useAlerts.getState().turnOn();
    await first;
    expect(subscribing).toHaveBeenCalledTimes(1);
  });

  it('désinscrit le téléphone quand le lecteur éteint les alertes', () => {
    const unsubscribing = jest.spyOn(ALERTS, 'unsubscribe').mockResolvedValue(undefined);
    useAlerts.setState({ wanted: true });
    useAlerts.getState().turnOff();
    expect(unsubscribing).toHaveBeenCalledTimes(1);
    expect(useAlerts.getState()).toMatchObject({ wanted: false, blocked: false });
  });

  it('relit ce que la plateforme permet pour un lecteur qui veut les alertes, et pour lui seul', async () => {
    const asking = jest.spyOn(ALERTS, 'permitted').mockResolvedValue(false);
    await useAlerts.getState().check();
    expect(asking).not.toHaveBeenCalled();
    useAlerts.setState({ wanted: true });
    await useAlerts.getState().check();
    expect(useAlerts.getState().blocked).toBe(true);
    asking.mockResolvedValue(true);
    await useAlerts.getState().check();
    expect(useAlerts.getState().blocked).toBe(false);
  });

  /** The screen reads the platform again without waiting on the answer: a OneSignal that could not start is no answer. */
  it('ne lève pas quand OneSignal n’a pas pu démarrer pour relire ce que la plateforme permet', async () => {
    jest.spyOn(ALERTS, 'permitted').mockRejectedValue(new Error('module natif absent'));
    useAlerts.setState({ wanted: true });
    await expect(useAlerts.getState().check()).resolves.toBeUndefined();
    expect(useAlerts.getState().blocked).toBe(false);
  });

  /**
   * A file on a phone is not a value the type system has ever seen, and alerts nobody asked for are the one mistake
   * this store cannot make: only the disk saying exactly `true` turns them on.
   */
  it('ne croit pas sur parole ce que le disque dit des alertes', async () => {
    for (const odd of ['true', 1, ['wanted'], null]) {
      await writeDisk({ wanted: odd });
      expect(useAlerts.getState().wanted).toBe(false);
    }
    await writeDisk('oui');
    expect(useAlerts.getState().wanted).toBe(false);
    await writeDisk({ wanted: true });
    expect(useAlerts.getState().wanted).toBe(true);
  });
});

describe('resumeAlerts', () => {
  it('reprend les alertes d’un lecteur qui les voulait, et ne démarre rien pour un autre', () => {
    const resuming = jest.spyOn(ALERTS, 'resume').mockReturnValue(undefined);
    resumeAlerts();
    expect(resuming).not.toHaveBeenCalled();
    useAlerts.setState({ wanted: true });
    resumeAlerts();
    expect(resuming).toHaveBeenCalledTimes(1);
  });
});
