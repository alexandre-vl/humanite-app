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
 * The names under which the store holds something the next person to pick up the phone must not read.
 *
 * The paper is one of them: a body the service only sends to a subscription is written there whole, and stays the
 * reader's alone. The token is the other, for as long as a phone upgraded from a build without a keystore still has
 * one to hand over. What is left — how the paper is printed, which articles were kept — is the reader's own and
 * harms nobody by outliving its own removal.
 *
 * The list is split here, at the registry, rather than recalled at each call: MMKV appends, so taking a key out and
 * erasing what was under it are two different operations, and the store offers one of each. Naming which keys are
 * which makes the compiler refuse the wrong one — three call sites had it wrong on 24/09/2026, and a convention
 * would have had to be remembered at the fourth.
 */
type Secret = 'queryCache' | 'readerTokenWas';

/** A key whose value must not survive its own removal. */
export type SecretKey = (typeof STORAGE_KEYS)[Secret];

/** A key holding nothing anyone else is kept from: taking it out is enough. */
export type PlainKey = (typeof STORAGE_KEYS)[Exclude<keyof typeof STORAGE_KEYS, Secret>];

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
