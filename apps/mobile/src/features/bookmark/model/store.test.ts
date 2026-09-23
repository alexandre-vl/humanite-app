import type { ArticleSummary } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { content } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { useBookmarks } from './store';

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.bookmarks) ?? 'null');

/** Two articles of the paper, as a feed hands them to the mark. */
const twoArticles = async (): Promise<readonly [ArticleSummary, ArticleSummary]> => {
  const [first, second] = (await content.getFeed({})).items;
  if (first === undefined || second === undefined) {
    throw new Error('le journal sert moins de deux articles : le test ne vérifierait rien');
  }
  return [first, second];
};

beforeEach(() => {
  useBookmarks.setState({ kept: [] });
});

describe('useBookmarks', () => {
  it('garde le dernier marqué en premier, et rend ce qu’on lui reprend', async () => {
    const [first, second] = await twoArticles();
    const { toggle } = useBookmarks.getState();
    toggle(first);
    toggle(second);
    expect(useBookmarks.getState().kept.map((each) => each.id)).toEqual([second.id, first.id]);
    toggle(first);
    expect(useBookmarks.getState().kept.map((each) => each.id)).toEqual([second.id]);
  });

  it('écrit sous la clé du registre ce que la carte montre, avec la version de ce qu’il écrit', async () => {
    const [first] = await twoArticles();
    useBookmarks.getState().toggle(first);
    expect(onDisk()).toEqual({ state: { kept: [first] }, version: 3 });
  });

  /** An article opened whole is kept as its card: a body written beside the shelf would be a copy of the paper. */
  it('ne garde d’un article ouvert que son résumé, jamais son corps', async () => {
    const [first] = await twoArticles();
    const article = await content.getArticle(first.id);
    useBookmarks.getState().toggle(article);
    const [kept] = useBookmarks.getState().kept;
    expect(kept).toEqual(first);
    expect(JSON.stringify(onDisk())).not.toContain('"blocks"');
  });

  /**
   * A file on a phone is not a value the type system has ever seen: it survives the app that wrote it, and anything at
   * all could have replaced it. Read back entry by entry through the contract's own parser, what is not a summary is
   * left behind — so nothing downstream ever handles one that is not one.
   */
  it('ne croit pas sur parole ce que le disque dit d’un article gardé', async () => {
    const [first, second] = await twoArticles();
    storage.set(
      STORAGE_KEYS.bookmarks,
      JSON.stringify({ state: { kept: [first, 42, { id: 'PAS UN IDENTIFIANT' }, null, second] }, version: 3 }),
    );
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().kept).toEqual([first, second]);
  });

  it('repart de rien quand le disque ne porte pas la forme attendue', async () => {
    storage.set(STORAGE_KEYS.bookmarks, JSON.stringify({ state: { kept: 'pol-a1' }, version: 3 }));
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().kept).toEqual([]);
  });

  /**
   * The second format wrote an item with no standfirst with an empty one, which the contract now refuses: read as it
   * was, every such article would vanish from the shelf. It is brought forward instead, as an item with none.
   */
  it('garde ce que le deuxième format a écrit, le chapô vide lu comme absent', async () => {
    const [first, second] = await twoArticles();
    const { standfirst, ...bare } = first;
    expect(standfirst).toBeDefined();
    storage.set(
      STORAGE_KEYS.bookmarks,
      JSON.stringify({ state: { kept: [{ ...bare, standfirst: '' }, second] }, version: 2 }),
    );
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().kept).toEqual([bare, second]);
  });

  /** The first format held ids alone, which nothing on the phone can turn back into cards: it is dropped, not misread. */
  it('écarte ce qu’un format antérieur a écrit plutôt que de le lire pour ce qu’il n’est pas', async () => {
    storage.set(STORAGE_KEYS.bookmarks, JSON.stringify({ state: { ids: ['pol-a1', 'mon-a2'] }, version: 1 }));
    await useBookmarks.persist.rehydrate();
    expect(useBookmarks.getState().kept).toEqual([]);
  });
});
