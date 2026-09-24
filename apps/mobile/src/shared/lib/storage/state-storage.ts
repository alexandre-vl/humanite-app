import type { PlainKey } from './keys';
import { storage } from './storage';

/**
 * A place to keep one string, as a store middleware reads and writes it.
 *
 * The shape is declared here rather than imported: it is three functions, it is the same three in every library that
 * keeps state, and naming it ourselves keeps the store's own package out of the shared libraries — where the storage
 * it wraps is confined, and where nothing else has any business holding state.
 */
export type StateStorage = Readonly<{
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}>;

/**
 * The registered `key` as one such place.
 *
 * The name a middleware passes is ignored on purpose: the key comes from the registry, which is the only list of what
 * the app writes to disk, and a name travelling down from a store would be a second one. Absence is returned as the
 * null a middleware expects, the storage answering with `undefined`.
 */
export const stateStorage = (key: PlainKey): StateStorage => ({
  getItem: () => storage.getString(key) ?? null,
  setItem: (name, value) => {
    storage.set(key, value);
  },
  removeItem: () => {
    storage.remove(key);
  },
});
