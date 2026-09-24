import { READER } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { queryClient } from './query-client';

/**
 * Drops everything the app is holding of the paper whenever the reader changes — whoever changed it.
 *
 * Everything in the cache was read as whoever was signed in when it was read: an article the service withheld from
 * nobody is kept as withheld, a list carries that on every card, and a body a subscription paid for is kept whole.
 * So the paper is dropped when the reader is no longer the same one, and what is on screen is asked again under
 * whoever is signed in now.
 *
 * It is wired here, once, rather than in the screen that signs a reader in, because a screen is not the only thing
 * that changes the reader. A reading the service refuses under a dead token makes the door forget that token with
 * nobody having pressed anything (ADR-0033, R9), and that left a subscriber's paid bodies in the cache — and on the
 * disk — of a phone whose session had ended. One place that watches the token covers every way it can move, and
 * covers the ways nobody has written yet.
 *
 * Queries are reset rather than dropped: the screens showing them keep their observers and ask again, where dropping
 * the queries outright would leave them pointing at nothing until something else made them render. The disk is then
 * emptied by name rather than left to follow. The cache is written through a door that holds a write for a second,
 * so a phone killed inside that second would restart on the pages of the reader who has just gone; and a cache that
 * was already empty in memory emits nothing for that door to carry, so nothing would have been written at all.
 *
 * Nothing unsubscribes. The reader and the cache both live as long as the app does, and so does this.
 */
export const forgetThePaperWhenTheReaderChanges = (): void => {
  READER.watch(() => {
    void queryClient.resetQueries();
    storage.remove(STORAGE_KEYS.queryCache);
  });
};
