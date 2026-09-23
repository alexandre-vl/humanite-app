import type { SetAside } from '@huma/contracts';
import type { RouteName } from '@huma/remote-api';
import { useSyncExternalStore } from 'react';

/**
 * What the journal's service sent that no reading could make an item of, since the app opened: the count, which is
 * what a reader can be shown, and the reasons, which are what a developer looking at the phone needs.
 *
 * A reading serves what it read and names what it did not; the names come here rather than to a console the lint
 * refuses everywhere. A list the service changed the shape of loses items without failing, so this is where that
 * change is seen before anyone wonders why the paper got thinner.
 */
const noted: (readonly [RouteName, SetAside])[] = [];
const listeners = new Set<() => void>();

/** Notes what a reading of `route` set aside, and tells whoever is watching. */
export const noteSetAside = (route: RouteName, items: readonly SetAside[]): void => {
  noted.push(...items.map((item) => [route, item] as const));
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const count = (): number => noted.length;

/** How many items the service sent that no reading could read, since the app opened. */
export const useSetAsideCount = (): number => useSyncExternalStore(subscribe, count);
