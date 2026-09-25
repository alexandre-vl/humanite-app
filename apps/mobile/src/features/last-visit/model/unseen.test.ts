import type { ArticleSummary } from '@huma/contracts';
import { instantAt, INSTANT } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content } from '#api';
import { unseenOf } from './unseen';

/** Three items of the wire, newest first, filed an hour apart from noon, Paris time. */
const run = async (): Promise<readonly ArticleSummary[]> => {
  const { items } = await content.getFeed({});
  const [template] = items;
  if (template === undefined) {
    throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
  }
  return ['12:00', '11:00', '10:00'].map((hour, index) => ({
    ...template,
    id: items[index]?.id ?? template.id,
    publishedAt: INSTANT.parse(instantAt(`2026-09-25 ${hour}`)),
  }));
};

describe('unseenOf', () => {
  /** Everything is new on a first visit, and a count of the whole run tells a reader nothing they can use. */
  it('ne compte rien à la première visite', async () => {
    expect(unseenOf(await run(), null)).toBeNull();
  });

  it('compte ce qui est paru après le plus récent article que le fil a montré', async () => {
    const items = await run();
    expect(unseenOf(items, items[2]?.publishedAt ?? null)).toEqual({ count: 2, atLeast: false });
  });

  it('ne dit rien quand rien n’est paru depuis', async () => {
    const items = await run();
    expect(unseenOf(items, items[0]?.publishedAt ?? null)).toBeNull();
  });

  /** What came out between the last item seen and the oldest read so far lies below the run, and is not counted. */
  it('ne donne qu’un minimum quand tout ce qui est lu jusque-là est neuf', async () => {
    const items = await run();
    expect(unseenOf(items, INSTANT.parse(instantAt('2026-09-24 18:00')))).toEqual({ count: 3, atLeast: true });
  });
});
