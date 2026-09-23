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
} as const;

/** A registered MMKV key; the store accepts no other. */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
