import { beforeEach, describe, expect, it } from '@jest/globals';
import { deleteItemAsync, getItem, setItem } from 'expo-secure-store';
import { keychain } from './keychain';
import { KEYCHAIN_KEYS, STORAGE_KEYS } from './keys';
import { storage } from './storage';

const TOKEN = 'jeton-de-labonne';

/**
 * An entry the platform can no longer open, as the double in jest.setup.ts stands for one: reading it raises there
 * exactly as the phone's keystore raises once the hardware key that sealed the entry is gone.
 */
const SEALED_SHUT = 'scellé-par-une-clé-perdue';

/** What the keystore itself holds, read past the module under test. */
const inKeystore = (): string | null => getItem(KEYCHAIN_KEYS.readerToken);

beforeEach(async () => {
  await deleteItemAsync(KEYCHAIN_KEYS.readerToken);
  storage.forget(STORAGE_KEYS.readerTokenWas);
});

describe('keychain', () => {
  it('rend ce qu’on lui a confié, et rien quand on ne lui a rien confié', () => {
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
    keychain.setItem(KEYCHAIN_KEYS.readerToken, TOKEN);
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBe(TOKEN);
  });

  /**
   * The platform only deletes asynchronously. A phone killed between the call and its completion would still hold the
   * token while the app had told the reader they were signed out, so the secret is overwritten first — synchronously,
   * and therefore whatever happens next.
   */
  it('écrase le secret avant de supprimer, et non l’inverse', () => {
    keychain.setItem(KEYCHAIN_KEYS.readerToken, TOKEN);
    keychain.removeItem(KEYCHAIN_KEYS.readerToken);
    // Read straight from the keystore, without waiting for anything: the token must already be gone.
    expect(inKeystore()).not.toBe(TOKEN);
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
  });

  it('lit comme une absence l’entrée vide que l’écrasement laisse', () => {
    setItem(KEYCHAIN_KEYS.readerToken, '');
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
  });

  /**
   * A reader signed in under a build that kept the token in the plain store would otherwise be signed out by the
   * upgrade — and would leave the token behind in a file nothing reads and nothing clears any more.
   */
  it('reprend le jeton laissé dans l’ancien magasin, et l’y efface', () => {
    storage.set(STORAGE_KEYS.readerTokenWas, TOKEN);
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBe(TOKEN);
    expect(storage.getString(STORAGE_KEYS.readerTokenWas)).toBeUndefined();
    expect(inKeystore()).toBe(TOKEN);
  });

  it('ne reprend rien une seconde fois, l’ancien magasin étant vide', () => {
    storage.set(STORAGE_KEYS.readerTokenWas, TOKEN);
    keychain.getItem(KEYCHAIN_KEYS.readerToken);
    keychain.removeItem(KEYCHAIN_KEYS.readerToken);
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
  });

  /** A reader who had signed out under the old build left an empty entry behind, which is not a token to bring over. */
  it('ne reprend pas une entrée vide de l’ancien magasin', () => {
    storage.set(STORAGE_KEYS.readerTokenWas, '');
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
    expect(storage.getString(STORAGE_KEYS.readerTokenWas)).toBeUndefined();
  });

  /**
   * The case that put this here. A keystore entry is sealed by a key the phone's hardware holds, and that key does
   * not always outlive the phone's settings — changing the screen lock invalidates it, as can a system upgrade or a
   * restore. The entry then stays where it was and stops being readable, and the platform says so by raising.
   *
   * Measured on the phone on 24/09/2026 with eight bytes of the stored ciphertext replaced: the raise came out of
   * `createReader`, which a module builds on its first line, so nothing was left to catch it and the app did not
   * start at all. A token that cannot be read is a token the app does not have, and that is what is answered.
   */
  it('lit comme une absence une entrée que la plateforme ne sait plus ouvrir', () => {
    setItem(KEYCHAIN_KEYS.readerToken, SEALED_SHUT);
    expect(() => keychain.getItem(KEYCHAIN_KEYS.readerToken)).not.toThrow();
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBeNull();
  });

  /** And empties it on the way out: left in place it would raise again at every launch, with no way back in. */
  it('vide l’entrée illisible, pour qu’elle ne revienne pas au démarrage suivant', () => {
    setItem(KEYCHAIN_KEYS.readerToken, SEALED_SHUT);
    keychain.getItem(KEYCHAIN_KEYS.readerToken);
    expect(inKeystore()).not.toBe(SEALED_SHUT);
    keychain.setItem(KEYCHAIN_KEYS.readerToken, TOKEN);
    expect(keychain.getItem(KEYCHAIN_KEYS.readerToken)).toBe(TOKEN);
  });
});
