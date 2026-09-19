/** The registry of MMKV keys: the single source of the app's persisted-storage keys. */
export const STORAGE_KEYS = { queryCache: 'query-cache', bookmarks: 'bookmarks' } as const;

/** A registered MMKV key; the store accepts no other. */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
