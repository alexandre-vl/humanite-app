import { CLIENT_NAME } from '@huma/remote-api';
import { describe, expect, it } from '@jest/globals';
import { ALERTS, CLIENT_TAG, createAlerts, JOURNAL_ALERTS_APP } from './alerts';
import type { Sdk } from './alerts';

/** Everything the app asked of OneSignal, in order, as one line each. */
type Calls = string[];

/**
 * A stand-in for OneSignal that writes down what it is asked, lets the platform answer `permission`, and hands back
 * the listener of touches it was given, so a test can touch an alert as a reader would.
 */
const probe = (permission = true) => {
  const calls: Calls = [];
  let loads = 0;
  let touch: (address: string | undefined) => void = () => undefined;
  const sdk: Sdk = {
    initialize: (app) => calls.push(`initialize ${app}`),
    requestPermission: async () => {
      calls.push('requestPermission');
      return Promise.resolve(permission);
    },
    hasPermission: async () => Promise.resolve(permission),
    optIn: () => calls.push('optIn'),
    optOut: () => calls.push('optOut'),
    tag: (key, value) => calls.push(`tag ${key}=${value}`),
    pauseMessages: () => calls.push('pauseMessages'),
    onTouch: (touched) => {
      calls.push('onTouch');
      touch = touched;
    },
  };
  return {
    calls,
    loads: () => loads,
    touch: (address: string | undefined) => {
      touch(address);
    },
    sdkOf: async (): Promise<Sdk> => {
      loads += 1;
      return Promise.resolve(sdk);
    },
  };
};

/** What a start asks of OneSignal, before anything a reader asked for. */
const STARTED = [`initialize ${JOURNAL_ALERTS_APP}`, 'pauseMessages', `tag ${CLIENT_TAG}=${CLIENT_NAME}`, 'onTouch'];

describe('createAlerts', () => {
  it('ne charge ni ne démarre OneSignal tant que le lecteur n’a rien demandé', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    alerts.onOpen(() => undefined);
    await alerts.unsubscribe();
    expect(await alerts.permitted()).toBe(false);
    expect(one.loads()).toBe(0);
    expect(one.calls).toEqual([]);
  });

  it('abonne le téléphone sous l’application du journal, en se nommant, et ne l’inscrit qu’une fois permis', async () => {
    const one = probe(true);
    const alerts = createAlerts(true, one.sdkOf);
    expect(await alerts.subscribe()).toBe(true);
    expect(one.calls).toEqual([...STARTED, 'requestPermission', 'optIn']);
  });

  it('n’inscrit pas le téléphone que la plateforme empêche de notifier', async () => {
    const one = probe(false);
    const alerts = createAlerts(true, one.sdkOf);
    expect(await alerts.subscribe()).toBe(false);
    expect(one.calls).toEqual([...STARTED, 'requestPermission']);
  });

  it('ne démarre OneSignal qu’une fois par processus, que l’app le reprenne ou que le lecteur s’abonne', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    alerts.resume();
    await alerts.subscribe();
    await alerts.subscribe();
    expect(one.loads()).toBe(1);
    expect(one.calls.filter((call) => call.startsWith('initialize'))).toHaveLength(1);
  });

  it('désinscrit un téléphone démarré, sans rien lui demander d’autre', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    await alerts.subscribe();
    await alerts.unsubscribe();
    expect(one.calls.at(-1)).toBe('optOut');
  });

  it('ne charge rien, ne demande rien et ne promet rien à une build qui n’a pas les alertes', async () => {
    const one = probe();
    const alerts = createAlerts(false, one.sdkOf);
    alerts.resume();
    expect(alerts.offered()).toBe(false);
    expect(await alerts.subscribe()).toBe(false);
    expect(one.loads()).toBe(0);
  });

  it('mène à chaque écoute l’adresse de l’alerte touchée, et ignore une alerte qui n’en porte pas', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    await alerts.subscribe();
    const opened: string[] = [];
    alerts.onOpen((address) => opened.push(address));
    one.touch('https://www.humanite.fr/politique/gauche/un-article');
    one.touch(undefined);
    one.touch('');
    expect(opened).toEqual(['https://www.humanite.fr/politique/gauche/un-article']);
  });

  it('garde pour la première écoute l’alerte touchée avant qu’aucune n’écoute, et ne la mène qu’une fois', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    alerts.resume();
    await alerts.subscribe();
    one.touch('https://www.humanite.fr/societe/greve/une-alerte');
    const first: string[] = [];
    const second: string[] = [];
    alerts.onOpen((address) => first.push(address));
    alerts.onOpen((address) => second.push(address));
    expect(first).toEqual(['https://www.humanite.fr/societe/greve/une-alerte']);
    expect(second).toEqual([]);
  });

  it('cesse de mener les alertes à une écoute retirée', async () => {
    const one = probe();
    const alerts = createAlerts(true, one.sdkOf);
    await alerts.subscribe();
    const opened: string[] = [];
    const stop = alerts.onOpen((address) => opened.push(address));
    stop();
    alerts.onOpen(() => undefined);
    one.touch('https://www.humanite.fr/monde/ukraine/une-alerte');
    expect(opened).toEqual([]);
  });
});

describe('ALERTS', () => {
  // The bench reads the corpus, on the platform jest-expo answers: the alerts are the service's, and Android's.
  it('n’offre pas les alertes à une build qui lit le corpus', () => {
    expect(ALERTS.offered()).toBe(false);
  });
});
