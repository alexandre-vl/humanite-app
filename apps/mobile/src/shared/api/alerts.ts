import { CLIENT_NAME } from '@huma/remote-api';
import { Platform } from 'react-native';
import type { NotificationClickEvent } from 'react-native-onesignal';
import { CONTENT_SOURCE } from '../config';

/**
 * The journal's alerts: the news its desk pushes to its readers' phones, received here as the journal's own app
 * receives them (ADR-0043).
 *
 * The journal sends them through OneSignal, to every phone subscribed under its application there, and its app
 * subscribes each install at its first start (`HumaniteApplication.java` in the app 6.2.0). This app subscribes under
 * the same application — nothing narrower exists: OneSignal answers any app that names it with the journal's sender
 * and no Firebase project of its own, so the token is minted through OneSignal's shared one, which no package name
 * restricts (`android_params.js`, read on 28/09/2026). What it adds is only what a reader asks for, and when.
 *
 * Nothing is started before that. OneSignal is not initialised at all until the reader turns the alerts on, so a
 * reader who never does sends nothing to anyone; one who did is resumed at the next start, which keeps the
 * subscription the journal holds for them alive. Turning them off opts the phone out: OneSignal keeps the
 * subscription and sends it nothing more.
 *
 * Like the rest of the journal's service, it is kept to the place that reaches the journal: the package is confined
 * here by a lint policy, and the rest of the app sees the port below and nothing of OneSignal.
 */

/**
 * The journal's application at OneSignal, which its own app passes at every start. It is an identifier and not a
 * secret: every install of that app carries it and hands it to OneSignal in the clear, and OneSignal serves what any
 * app needs of it to anyone who names it.
 */
export const JOURNAL_ALERTS_APP = '18761932-f922-4f6c-9df0-bf936b8a6ac6';

/**
 * The tag a subscription of this app carries, with the name the client gives itself to the service. The journal's
 * desk sees its readers' subscriptions and not which app made each: tagged, the ones this app made are the journal's
 * to count, to leave out of a sending, or to remove — as it can tell this client's requests apart by their name.
 */
export const CLIENT_TAG = 'client';

/**
 * What the app asks of OneSignal, and nothing more: the handful of calls a subscription takes, named for what they do
 * here. It is a port rather than the SDK itself so that its use is read and tested apart from a phone — OneSignal
 * reaches a native module at import, which a test bench lacks and an iPhone build does not carry.
 */
export type Sdk = Readonly<{
  initialize: (app: string) => void;
  /** Asks the platform to let the app notify, and answers whether it may; it never sends the reader to the settings. */
  requestPermission: () => Promise<boolean>;
  /** Whether the platform lets the app notify now, as the reader may have changed it in the phone's settings. */
  hasPermission: () => Promise<boolean>;
  optIn: () => void;
  optOut: () => void;
  tag: (key: string, value: string) => void;
  /** Stops OneSignal from showing the journal's in-app messages: its own screens, drawn by nobody here. */
  pauseMessages: () => void;
  /** Calls `touched` with the address of each alert the reader touches, when it carries one. */
  onTouch: (touched: (address: string | undefined) => void) => void;
}>;

/** The journal's alerts as the app uses them: whether this build receives them, and the ways a reader changes that. */
export type Alerts = Readonly<{
  /**
   * Whether this build can receive the journal's alerts at all.
   *
   * A build that reads the journal's service can, on Android. A build on the simulated corpus cannot: an alert names an
   * article of the journal, which that build does not hold, and subscribing would sign the journal's list up for a
   * phone that reads fiction. An iPhone cannot either: Apple hands a notification to the one app it was addressed to,
   * and the journal addresses its own. A screen offers nothing a build cannot do.
   */
  offered: () => boolean;
  /**
   * Subscribes this phone, and answers whether the platform lets the app notify.
   *
   * It starts OneSignal if it was not, asks the platform's permission, and opts in only once it is given: a phone that
   * refuses is subscribed to nothing it could show. It answers `false` on a build that is not offered the alerts.
   */
  subscribe: () => Promise<boolean>;
  /** Opts this phone out, when it had been started; OneSignal keeps its subscription and sends it nothing. */
  unsubscribe: () => Promise<void>;
  /** Starts OneSignal again at a start of the app, for a reader who had turned the alerts on. */
  resume: () => void;
  /** Whether the platform lets the app notify: `false` until OneSignal has been started, which asks nothing before. */
  permitted: () => Promise<boolean>;
  /**
   * Calls `open` with the address of each alert the reader touches, and answers with what stops listening.
   *
   * A touch that came before anyone listened is kept for the first listener, one touch deep: the reader who opens
   * the app from an alert has touched it before the app has a screen to take them anywhere.
   */
  onOpen: (open: (address: string) => void) => () => void;
}>;

/** Alerts over one SDK, loaded only when a reader first wants them, on a build `offered` says may have them at all. */
export const createAlerts = (offered: boolean, sdkOf: () => Promise<Sdk>): Alerts => {
  let started: Promise<Sdk> | undefined;
  let waiting: string | undefined;
  const listeners = new Set<(address: string) => void>();
  const touched = (address: string | undefined): void => {
    if (address === undefined || address === '') {
      return;
    }
    if (listeners.size === 0) {
      waiting = address;
      return;
    }
    for (const open of listeners) {
      open(address);
    }
  };
  // Once per process: OneSignal is initialised once, and its touches are heard by one listener that hands them on.
  const start = async (): Promise<Sdk> => {
    started ??= sdkOf().then((sdk) => {
      sdk.initialize(JOURNAL_ALERTS_APP);
      sdk.pauseMessages();
      sdk.tag(CLIENT_TAG, CLIENT_NAME);
      sdk.onTouch(touched);
      return sdk;
    });
    return started;
  };
  return {
    offered: () => offered,
    subscribe: async () => {
      if (!offered) {
        return false;
      }
      const sdk = await start();
      const granted = await sdk.requestPermission();
      if (granted) {
        sdk.optIn();
      }
      return granted;
    },
    unsubscribe: async () => {
      if (started !== undefined) {
        (await started).optOut();
      }
    },
    resume: () => {
      if (offered) {
        // A start that fails leaves the alerts where they were: the reader finds them off in the settings screen's
        // answer, and nothing on this path has a screen to say it on.
        start().catch(() => undefined);
      }
    },
    permitted: async () => (started === undefined ? false : (await started).hasPermission()),
    onOpen: (open) => {
      listeners.add(open);
      if (waiting !== undefined) {
        const address = waiting;
        waiting = undefined;
        open(address);
      }
      return () => {
        listeners.delete(open);
      };
    },
  };
};

/**
 * OneSignal itself, loaded when the alerts are first started and not before.
 *
 * Loaded late because loading it is not free of consequence: the package asks for its native module at import and
 * throws when there is none, which is every iPhone build — the app's `package.json` keeps OneSignal out of iOS.
 */
const oneSignal = async (): Promise<Sdk> => {
  const { OneSignal } = await import('react-native-onesignal');
  return {
    initialize: (app) => {
      OneSignal.initialize(app);
    },
    requestPermission: async () => OneSignal.Notifications.requestPermission(false),
    hasPermission: async () => OneSignal.Notifications.getPermissionAsync(),
    optIn: () => {
      OneSignal.User.pushSubscription.optIn();
    },
    optOut: () => {
      OneSignal.User.pushSubscription.optOut();
    },
    tag: (key, value) => {
      OneSignal.User.addTag(key, value);
    },
    pauseMessages: () => {
      OneSignal.InAppMessages.setPaused(true);
    },
    onTouch: (touched) => {
      // The address the touch opens, as the journal's app reads it (`event.getResult().getUrl()`), and the one the
      // alert itself carries when a touch names none.
      OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
        touched(event.result.url ?? event.notification.launchURL);
      });
    },
  };
};

/** The journal's alerts, for every build: offered to the builds of the service that run on Android, and no other. */
export const ALERTS: Alerts = createAlerts(CONTENT_SOURCE === 'service' && Platform.OS === 'android', oneSignal);
