import { createMMKV } from 'react-native-mmkv';
import type { StorageKey } from './keys';

const mmkv = createMMKV({ id: 'humanite' });

/** The app's key-value store: synchronous MMKV reads and writes, confined to the registered keys. */
export const storage = {
  getString: (key: StorageKey): string | undefined => mmkv.getString(key),
  set: (key: StorageKey, value: string): void => {
    mmkv.set(key, value);
  },
  remove: (key: StorageKey): void => {
    mmkv.remove(key);
  },
};
