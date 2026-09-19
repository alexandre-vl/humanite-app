import { ARTICLE_ID } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { useBookmarks } from './store';

const FIRST = ARTICLE_ID.parse('pol-a1');
const SECOND = ARTICLE_ID.parse('mon-a2');

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.bookmarks) ?? 'null');

beforeEach(() => {
  useBookmarks.setState({ ids: [] });
});

describe('useBookmarks', () => {
  it('garde le dernier marqué en premier, et rend ce qu’on lui reprend', () => {
    const { toggle } = useBookmarks.getState();
    toggle(FIRST);
    toggle(SECOND);
    expect(useBookmarks.getState().ids).toEqual([SECOND, FIRST]);
    toggle(FIRST);
    expect(useBookmarks.getState().ids).toEqual([SECOND]);
  });

  it('écrit sous la clé du registre, avec la version de ce qu’il écrit', () => {
    useBookmarks.getState().toggle(FIRST);
    expect(onDisk()).toEqual({ state: { ids: [FIRST] }, version: 1 });
  });

  /**
   * A file on a phone is not a value the type system has ever seen: it survives the app that wrote it, and anything at
   * all could have replaced it. Read back entry by entry through the contract's own parser, what is not an id is left
   * behind — so nothing downstream ever handles one that is not one.
   */
  it('ne croit pas sur parole ce que le disque dit d’un identifiant', async () => {
    storage.set(
      STORAGE_KEYS.bookmarks,
      JSON.stringify({ state: { ids: ['pol-a1', 42, 'PAS UN IDENTIFIANT', null, 'mon-a2'] }, version: 1 }),
    );
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().ids).toEqual([FIRST, SECOND]);
  });

  it('repart de rien quand le disque ne porte pas la forme attendue', async () => {
    storage.set(STORAGE_KEYS.bookmarks, JSON.stringify({ state: { ids: 'pol-a1' }, version: 1 }));
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().ids).toEqual([]);
  });
});
