import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleWire, liveFeedQuery, usePagedFeed } from '#entities/article';
import { articleHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Surface } from '#primitives/surface';

const useStyles = createStyles((theme) => ({
  wire: { backgroundColor: theme.primary },
}));

/**
 * The En continu screen: the day's items as a running wire, on the ground the paper gives that wire.
 *
 * It carries no title band of its own. The tab bar already names the screen, the screen it copies shows no such band,
 * and the list pins the head of each day at the very top of its frame — which is exactly where a band would sit.
 *
 * It carries no band of sections either, which the screen it copies does. Three reasons, and the weakest is the type:
 * a list either hands bands to the top of its frame or pins rows of its own, never both, and this one pins a day. The
 * second is that the reference document counts the stacked bands of the front page among its own faults, the content
 * left with two thirds of the screen; a wire read by the minute is the last place to spend a row on somewhere else.
 * The third is what the screen is: one column, every section at once, in the order things happened — a band naming
 * one section would offer to leave, and leaving is already a tab away.
 */
export function LivePage(): ReactNode {
  const styles = useStyles();
  const feed = usePagedFeed(liveFeedQuery);
  return (
    <Surface style={styles.wire}>
      <ArticleWire
        feed={feed}
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
      />
    </Surface>
  );
}
