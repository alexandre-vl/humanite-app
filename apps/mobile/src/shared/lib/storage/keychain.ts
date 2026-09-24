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
      setItem(KEYCHAIN_KEYS.readerToken, kept, OPTIONS);
    }
    storage.forget(STORAGE_KEYS.readerTokenWas);
  }
};

/**
 * The keystore as one place to keep one string.
 *
 * Removal overwrites before it deletes, and does not wait for the delete. The platform only offers to delete an entry
 * asynchronously; a phone that is killed between the call and its completion would still be holding the token, and
 * the app would have told the reader they were signed out. Writing an empty string first is synchronous, so by the
 * time `removeItem` returns the secret is already gone whatever happens next — the delete that follows only tidies
 * the empty entry away.
 */
export const keychain: StateStorage = {
  getItem: () => {
    broughtForward();
    const held = getItem(KEYCHAIN_KEYS.readerToken, OPTIONS);
    return held === null || held === '' ? null : held;
  },
  setItem: (...[, value]) => {
    setItem(KEYCHAIN_KEYS.readerToken, value, OPTIONS);
  },
  removeItem: () => {
    setItem(KEYCHAIN_KEYS.readerToken, '', OPTIONS);
    void deleteItemAsync(KEYCHAIN_KEYS.readerToken, OPTIONS);
  },
};
