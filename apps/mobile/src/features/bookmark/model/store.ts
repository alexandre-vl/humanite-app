import type { ArticleId } from '@huma/contracts';
import { ARTICLE_ID } from '@huma/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, stateStorage } from '#lib/storage';

/**
 * The version of what this writes to disk. It names the first shape rather than describing a change — a list of ids —
 * and is read back before anything is restored, so the day the shape moves, what was written under this number is
 * either brought forward or dropped, never read as though it had always meant the same thing.
 */
const VERSION = 1;

/** What the reader has kept, newest first, and the one thing they do to it. */
type Kept = Readonly<{
  ids: readonly ArticleId[];
  toggle: (id: ArticleId) => void;
}>;

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/**
 * The ids a disk holds, as ids.
 *
 * What comes back is a string the app wrote and anything at all could have replaced: a file on a phone is not a value
 * the type system has ever seen. It is therefore read one entry at a time through the contract's own parser, and what
 * does not come out of it is left behind — so nothing downstream ever handles an `ArticleId` that is not one.
 */
const keptIds = (persisted: unknown): readonly ArticleId[] => {
  if (typeof persisted !== 'object' || persisted === null || !('ids' in persisted)) {
    return [];
  }
  const { ids } = persisted;
  if (!isList(ids)) {
    return [];
  }
  return ids.flatMap((each) => {
    const read = ARTICLE_ID.safeParse(each);
    return read.success ? [read.data] : [];
  });
};

/**
 * The articles the reader has kept.
 *
 * Kept newest first, which is the order the screen shows them in: what was just put aside is what one comes back for,
 * and the paper's own order is what the four other feeds already give. The order is the list itself, so nothing sorts.
 *
 * Only the ids are written; the one action is rebuilt at each start, a function being nothing a disk can hold.
 */
export const useBookmarks = create<Kept>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id: ArticleId): void => {
        set((kept) => ({
          ids: kept.ids.includes(id) ? kept.ids.filter((each) => each !== id) : [id, ...kept.ids],
        }));
      },
    }),
    {
      name: STORAGE_KEYS.bookmarks,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.bookmarks)),
      partialize: (kept) => ({ ids: kept.ids }),
      merge: (persisted, current) => ({ ...current, ids: keptIds(persisted) }),
    },
  ),
);
