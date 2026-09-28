import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ALERTS } from '#api';
import { useAlerts } from './store';

/** The journal's alerts as the screen that sets them shows them: whether they exist here, where they stand, a switch. */
type AlertsSetting = Readonly<{
  /** Whether this build receives the journal's alerts at all; a screen offers nothing when it does not. */
  offered: boolean;
  /** Where the switch stands: on for a reader who wants the alerts, and while the platform is being asked for them. */
  on: boolean;
  /** The platform will not let the app notify: that is changed in the phone's settings, and nowhere in the app. */
  blocked: boolean;
  choose: (wanted: boolean) => void;
}>;

/**
 * The reader's alerts, for the screen that sets them.
 *
 * What the platform lets the app do is the reader's to change in the phone's settings, behind the app's back, so it is
 * read again when the screen comes up and each time the app comes back to the front — which is where a reader who
 * went to the settings to let the alerts through comes back to.
 */
export const useAlertsSetting = (): AlertsSetting => {
  const wanted = useAlerts((standing) => standing.wanted);
  const asking = useAlerts((standing) => standing.asking);
  const blocked = useAlerts((standing) => standing.blocked);
  const turnOn = useAlerts((standing) => standing.turnOn);
  const turnOff = useAlerts((standing) => standing.turnOff);
  const check = useAlerts((standing) => standing.check);
  useEffect(() => {
    void check();
    const watching = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });
    return () => {
      watching.remove();
    };
  }, [check]);
  return {
    offered: ALERTS.offered(),
    on: wanted || asking,
    blocked,
    choose: (chosen: boolean): void => {
      if (chosen) {
        void turnOn();
      } else {
        turnOff();
      }
    },
  };
};
