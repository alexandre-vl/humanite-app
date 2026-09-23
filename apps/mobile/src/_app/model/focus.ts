import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * Tells the query library when the app is in front of the reader, which it cannot tell by itself on a phone.
 *
 * Its own listener waits for a browser's `visibilitychange`, which React Native never fires, so it took the app to be
 * in front for ever: a paper left an hour in the background came back showing the hour-old pages until the reader
 * pulled them down. Told, it asks again for what went stale while the app was away — and only that, a read younger than
 * a minute being kept — and it holds back the tries it would have made while no one was looking.
 */
export const followTheApp = (): void => {
  focusManager.setEventListener((focused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      focused(state === 'active');
    });
    return () => {
      subscription.remove();
    };
  });
};
