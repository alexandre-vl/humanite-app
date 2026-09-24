import { CONTENT_SOURCE } from '../../config';

/**
 * The registry of MMKV keys: the single source of the app's persisted-storage keys.
 *
 * What the paper answered and what the reader kept of it are written under the source they came from. A phone that
 * ran a build on the corpus and then one on the journal's service would otherwise restore the corpus's pages into the
 * paper, and keep cards of articles the service never printed — ids of one source mean nothing to the other. What the
 * reader set for how the paper is printed is theirs whatever it prints, and is kept once.
 */
export const STORAGE_KEYS = {
  queryCache: `query-cache.${CONTENT_SOURCE}`,
  bookmarks: `bookmarks.${CONTENT_SOURCE}`,
  preferences: 'preferences',
  /**
   * Where the reader's token was kept before the keystore, and is kept no longer.
   *
   * It stays declared because the app still touches it: the first run of a build that has the keystore reads it, puts
   * what it finds where it now belongs, and erases it. A key the app can write and this list did not name would be a
   * thing written to a phone that nothing here accounts for; a key it only erases is still a key it touches.
   */
  readerTokenWas: `reader-token.${CONTENT_SOURCE}`,
} as const;

/** A registered MMKV key; the store accepts no other. */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * The names the app keeps in the phone's own keystore, which is not the same disk as the one above.
 *
 * One name, and it is the only secret the app holds. It is kept under its source for the reason the pages are: a
 * token earned at the journal's service proves nothing to a build that reads the simulated corpus, and a phone that
 * has run both should not offer one to the other.
 */
export const KEYCHAIN_KEYS = {
  readerToken: `reader-token.${CONTENT_SOURCE}`,
} as const;
