import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleWire, liveFeedQuery, usePagedFeed } from '#entities/article';
import { articleHref } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * The En continu screen: everything the newsroom filed, newest first, under the head of the day it was filed on.
 *
 * It is printed on the paper's own page. It used to be printed on the paper's red, edge to edge, every word on it in
 * white — which is how the screen it copies does it, and which cost three things. White on that red measures 3.83 to
 * one: the app's one knowing departure from the contrast it otherwise holds to, and it was being spent not on a mark
 * but on a screenful of running text, at the size running text is set in. A red that covers everything can mark
 * nothing, so the day the run belongs to, the item the newsroom picked out and the item one has already read all had
 * to be said some other way, and none of them was. And every picture the corpus draws was being laid on a ground it
 * was never drawn for. The red is still here, on the band that heads each day, which is the one thing on a list
 * ordered by time that is worth marking.
 *
 * It carries no title band of its own. The tab bar names the screen, the screen it copies shows no such band, and the
 * list pins the head of each day at the very top of its frame — which is exactly where a band would sit.
 *
 * It carries no band of sections either, which the screen it copies does. Three reasons, and the weakest is the type:
 * a list either hands bands to the top of its frame or pins rows of its own, never both, and this one pins a day. The
 * second is that the reference document counts the stacked bands of the front page among its own faults, the content
 * left with two thirds of the screen; a wire read by the minute is the last place to spend a row on somewhere else.
 * The third is what the screen is: one column, every section at once, in the order things happened — a band naming
 * one section would offer to leave, and leaving is already a tab away.
 */
export function LivePage(): ReactNode {
  const feed = usePagedFeed(liveFeedQuery);
  return (
    <Surface>
      <ArticleWire
        feed={feed}
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
      />
    </Surface>
  );
}
