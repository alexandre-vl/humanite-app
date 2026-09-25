import { router, useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ArticleWire, useArticleStream, useSections } from '#entities/article';
import { useLastVisit } from '#features/last-visit';
import { articleHref } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * The En continu screen: the whole paper in the order the newsroom filed it, under the head of each day, with a line
 * under what came out since the reader's last visit.
 *
 * It used to read the wire's own route and nothing else, and that route is two and a half hours long: it answers ten
 * items and pages no further — asked for a second page on 25/09/2026 it served the same ten, and asked for a larger
 * one it served ten. A reader who reached the foot of this screen had reached the foot of the paper at half past ten
 * in the morning. What pages is every section's own list, thirty at a time and months deep, so the screen reads all
 * eleven of them together and merges them: 102 articles over three days on the first reading, against ten over one
 * morning.
 *
 * Each article stands once. The journal's own app prints the newest ten, then five under each section's name, and
 * shows the same article in both — nine of ten, counted on 25/09/2026. On a screen that claims to be a running order,
 * a piece printed twice is a piece filed at two different times.
 *
 * It carries no band of sections any more. The band narrowed the run to one section, and one section's run is the
 * page of that section on Accueil: the two read the same list under the same key, so the band was a second door to
 * pages the front already turns, spent on the one screen whose whole claim is the paper in one order. The row it held
 * is the wire's now.
 *
 * It carries no title band either. The tab bar names the screen, and the list pins the head of each day at the very
 * top of its frame — which is exactly where a band would sit.
 *
 * It is printed on the paper's own page. It used to be printed on the paper's red, edge to edge, every word on it in
 * white — which is how the screen it copies does it, and which cost three things. White on that red measures 3.83 to
 * one: the app's one knowing departure from the contrast it otherwise holds to, and it was being spent not on a mark
 * but on a screenful of running text, at the size running text is set in. A red that covers everything can mark
 * nothing, so the day the run belongs to, the item the newsroom picked out and the item one has already read all had
 * to be said some other way, and none of them was. And every picture the corpus draws was being laid on a ground it
 * was never drawn for. The red is still here, on the band that heads each day, which is the one thing on a list
 * ordered by time that is worth marking — and on the line of the last visit, which is another.
 */
export function LivePage(): ReactNode {
  const sections = useSections();
  const ids = useMemo(() => sections.map((section) => section.id), [sections]);
  const feed = useArticleStream(ids);
  const since = useLastVisit(feed.items[0]?.publishedAt ?? null, useIsFocused());
  return (
    <Surface>
      <ArticleWire
        feed={feed}
        since={since}
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
      />
    </Surface>
  );
}
