import { createMMKV } from 'react-native-mmkv';
import type { PlainKey, SecretKey, StorageKey } from './keys';

const mmkv = createMMKV({ id: 'humanite' });

/**
 * The app's key-value store: synchronous MMKV reads and writes, confined to the registered keys.
 *
 * Two ways to take a key out, because the store offers two different guarantees and only one of them is erasure.
 * MMKV is an append-only log over a memory-mapped file: writing a key appends it, and removing one appends a
 * tombstone. The value's bytes stay where they were written until the log is rewritten, so a key that was removed is
 * a key the app no longer reads and anyone reading the file still can. Measured on the phone on 24/09/2026:
 * `adb shell run-as dev.humanite.app cat files/mmkv/humanite` still held three of a subscriber's tokens, at three
 * offsets, after the code that put them there had removed the key.
 */
export const storage = {
  getString: (key: StorageKey): string | undefined => mmkv.getString(key),
  set: (key: StorageKey, value: string): void => {
    mmkv.set(key, value);
  },
  /**
   * Takes the key out of what the app reads. What was written under it stays in the file.
   *
   * This is what a preference or a list of kept articles is worth: it no longer applies, and nothing is harmed by the
   * bytes outliving it. It is one append, where erasing is a rewrite of the whole file — so it takes the keys the
   * registry calls plain, and the compiler refuses it the others.
   */
  remove: (key: PlainKey): void => {
    mmkv.remove(key);
  },
  /**
   * Takes the key out and rewrites the file without it, so what was written under it is no longer there to read.
   *
   * `trim` writes the live entries back from the first byte and then shortens the file to fit them, which drops both
   * the tombstoned value and whatever the log had grown past it. Measured on the phone on 24/09/2026: a store of
   * 2 097 152 bytes holding three of a subscriber's tokens came back at 524 288, holding none.
   *
   * It costs a full rewrite, which is why it is not what `remove` does. It takes the keys the registry calls secret,
   * and the compiler refuses it the others — the two ways round are not interchangeable and neither is a default.
   */
  forget: (key: SecretKey): void => {
    mmkv.remove(key);
    mmkv.trim();
  },
};
