import { deleteItemAsync, getItem, setItem, WHEN_UNLOCKED_THIS_DEVICE_ONLY } from 'expo-secure-store';
import { KEYCHAIN_KEYS, STORAGE_KEYS } from './keys';
import type { StateStorage } from './state-storage';
import { storage } from './storage';

/**
 * The phone's own keystore, where the one secret this app holds is kept.
 *
 * A reader's token is not a preference and not a page of the paper: it is what proves, to the journal's service, that
 * the subscription is theirs. The rest of what the app keeps goes to MMKV, which is a file in the app's directory and
 * plain to anyone who can read that directory — a rooted phone, a backup, a forensic image. This goes to the
 * platform's keystore instead, where the key that opens it is held by hardware the app cannot read and cannot copy:
 * Android's Keystore behind EncryptedSharedPreferences, iOS's Keychain.
 *
 * It is asked for synchronously, which is what lets the client of the service ask for the token at every request
 * without a promise in the way. The platform offers both; only the removal is asynchronous, and that is handled below
 * rather than waited on.
 */

/**
 * How the keystore holds it: only while the phone is unlocked, and only on this phone.
 *
 * A token restored onto a second device from a backup would sign a stranger in as the subscriber, on a phone the
 * subscriber never had. The option is read on iOS, where a keychain entry travels with a backup unless it is told
 * not to; Android's keystore is bound to its hardware and never travels, so there the constant changes nothing and
 * naming it costs nothing.
 */
const OPTIONS = { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

/**
 * The token as it was kept before the keystore, moved across the first time this runs and erased where it was.
 *
 * A reader who had signed in under the old build would otherwise be signed out by the upgrade, and — worse — would
 * leave their token behind in a file that is no longer read and no longer cleared by anything, for as long as the app
 * stays installed. It is read once, written to the keystore, and forgotten in the store it came from; the second run
 * finds nothing to move.
 *
 * Forgotten rather than removed: the old store appends, so removing the key would have left the token's bytes in the
 * file for anyone able to read it, which is exactly the reader this move exists to shut out. The empty entry a
 * sign-out under the old build left behind is forgotten the same way — it holds no secret, but leaving it would mean
 * this ran again at every launch for the life of the install.
 */
const broughtForward = (): void => {
  const kept = storage.getString(STORAGE_KEYS.readerTokenWas);
  if (kept !== undefined) {
    if (kept !== '') {
      keep(kept);
    }
    storage.forget(STORAGE_KEYS.readerTokenWas);
  }
};

/**
 * Empties the entry, overwriting before deleting, and never raises.
 *
 * The platform only offers to delete asynchronously; a phone killed between the call and its completion would still
 * be holding the token while the app had told the reader they were signed out. Writing an empty string first is
 * synchronous, so by the time this returns the secret is already gone whatever happens next, and the delete that
 * follows only tidies the empty entry away (ADR-0034, R3).
 *
 * Both halves are guarded because this is also what runs when the keystore has already refused to answer: a platform
 * that cannot open an entry may well refuse to write it too, and there would be nothing left to do about it.
 */
const empty = (): void => {
  try {
    setItem(KEYCHAIN_KEYS.readerToken, '', OPTIONS);
  } catch {
    // Nothing to fall back on: the delete below is the only other thing that can take the entry away.
  }
  void deleteItemAsync(KEYCHAIN_KEYS.readerToken, OPTIONS).catch(() => undefined);
};

/**
 * Keeps the token, or keeps nothing and says nothing.
 *
 * A keystore that refuses a write leaves the reader signed in for this run and signed out at the next launch. That
 * is a poor outcome and it is the best one available: raising here would come back out of `signIn`, where a screen
 * would read it as a refusal and tell the reader their password was wrong — while the reader it had just built was,
 * in memory, signed in. A wrong answer about what happened is worse than a session that does not outlive the app.
 */
const keep = (token: string): void => {
  try {
    setItem(KEYCHAIN_KEYS.readerToken, token, OPTIONS);
  } catch {
    // Kept in memory by the reader that asked for this; nothing here can make the platform hold it.
  }
};

/**
 * What the keystore holds, or nothing at all when it holds something it can no longer open.
 *
 * An entry is sealed by a key the phone's hardware holds, and that key does not always outlive the phone's settings:
 * on Android, changing the screen lock invalidates it, and so can a system upgrade or a restore. The entry is then
 * still there and no longer readable, and the platform says so by raising.
 *
 * Measured on the phone on 24/09/2026, eight bytes of the stored ciphertext replaced:
 * `Call to function 'ExpoSecureStore.getValueWithKeySync' has been rejected. → Could not decrypt the value for key
 * 'reader-token.service' under keychain 'key_v1'. Caused by: bad base-64`, raised from `createReader`, which a
 * module builds on its first line. Nothing caught it and the app did not start at all.
 *
 * So a token that cannot be read is answered as a token the app does not have, which is what it is. It is emptied on
 * the way out as well: left in place it would be asked for again at the next launch, and at every launch after, and
 * the reader would have no way back in.
 */
const readable = (): string | null => {
  try {
    return getItem(KEYCHAIN_KEYS.readerToken, OPTIONS);
  } catch {
    empty();
    return null;
  }
};

/**
 * The keystore as one place to keep one string.
 *
 * None of the three raises. The shape they answer is three total functions — a string or its absence, and two that
 * return nothing — so a port that raised would be breaking the only contract its callers have: the reader reads it
 * on its first line, and that line is a module's, where nothing is left to catch anything.
 */
export const keychain: StateStorage = {
  getItem: () => {
    broughtForward();
    const held = readable();
    return held === null || held === '' ? null : held;
  },
  setItem: (...[, value]) => {
    keep(value);
  },
  removeItem: () => {
    empty();
  },
};
