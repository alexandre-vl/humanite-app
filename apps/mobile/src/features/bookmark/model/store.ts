import type { ArticleSummary } from '@huma/contracts';
import { ARTICLE_SUMMARY } from '@huma/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, field, stateStorage } from '#lib/storage';

/**
 * The version of what this writes to disk: every article kept, with its summary.
 *
 * It is read back before anything is restored, so what was written under another number is either brought forward or
 * dropped, never read as though it had always meant the same thing. The first version held ids alone, and nothing
 * here can turn an id back into a card without reading the article again: what it wrote is dropped.
 */
const VERSION = 2;

/** What the reader has kept, the last kept first, and the one thing they do to it. */
type Kept = Readonly<{
  kept: readonly ArticleSummary[];
  toggle: (summary: ArticleSummary) => void;
}>;

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/**
 * The summaries a disk holds, as summaries.
 *
 * What comes back is a string the app wrote and anything at all could have replaced: a file on a phone is not a value
 * the type system has ever seen. It is therefore read one entry at a time through the contract's own parser, and what
 * does not come out of it is left behind — so nothing downstream ever handles a summary that is not one.
 */
const keptSummaries = (persisted: unknown): readonly ArticleSummary[] => {
  const kept = field(persisted, 'kept');
  if (!isList(kept)) {
    return [];
  }
  return kept.flatMap((each) => {
    const read = ARTICLE_SUMMARY.safeParse(each);
    return read.success ? [read.data] : [];
  });
};

/**
 * The articles the reader has kept, each with what its card shows.
 *
 * An article is kept with its summary and not its id alone, so the shelf is drawn from the phone: nothing is asked of
 * the content to show it, offline as well as on, and the journal's service — which lists summaries but reads no batch
 * of them by id — is never asked for what it cannot answer. What is written is the summary and never a body, whatever
 * the toggle is handed: an article opened whole is kept as its card.
 *
 * Kept newest first, which is the order the screen shows them in: what was just put aside is what one comes back for,
 * and the paper's own order is what the other feeds already give. The order is the list itself, so nothing sorts.
 */
export const useBookmarks = create<Kept>()(
  persist(
    (set) => ({
      kept: [],
      toggle: (summary: ArticleSummary): void => {
        set((state) => ({
          kept: state.kept.some((each) => each.id === summary.id)
            ? state.kept.filter((each) => each.id !== summary.id)
            : [ARTICLE_SUMMARY.parse(summary), ...state.kept],
        }));
      },
    }),
    {
      name: STORAGE_KEYS.bookmarks,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.bookmarks)),
      partialize: (state) => ({ kept: state.kept }),
      migrate: () => ({ kept: [] }),
      merge: (persisted, current) => ({ ...current, kept: keptSummaries(persisted) }),
    },
  ),
);
