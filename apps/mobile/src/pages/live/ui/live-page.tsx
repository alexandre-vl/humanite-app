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
