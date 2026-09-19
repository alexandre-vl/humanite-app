import type { ArticleId, ArticleSummary } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import { Pressable } from '#primitives/pressable';
import type { ReadFeed } from '../model/paged-feed';
import { ArticleCard, shapeOf } from './article-card';
import type { EmptyWords } from './feed-stand-in';
import { FeedStandIn } from './feed-stand-in';

export type ArticleFeedProps = Readonly<{
  feed: ReadFeed;
  onOpen: (id: ArticleId) => void;
  action?: ((summary: ArticleSummary) => ReactNode) | undefined;
  header?: ReactNode;
  sticky?: ReactNode;
  stickyRows?: 1 | 2 | undefined;
  empty?: EmptyWords | undefined;
}>;

const useStyles = createStyles(() => ({
  feed: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  item: { paddingTop: SPACING.md },
}));

/**
 * A paged feed of articles, under the bands its screen supplies, asking for the next page as the end comes near.
 *
 * It reports which article was pressed and goes nowhere itself: an entity may not name a route, and the screen that
 * mounts the feed is the one that knows what opening an article means for it.
 */
export function ArticleFeed({ feed, onOpen, action, header, sticky, stickyRows, empty }: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  return (
    <List
      items={feed.items}
      keyOf={(summary) => summary.id}
      typeOf={shapeOf}
      renderItem={(summary) => (
        <Box style={styles.item}>
          <Pressable
            onPress={() => {
              onOpen(summary.id);
            }}
          >
            <ArticleCard summary={summary} action={action?.(summary)} />
          </Pressable>
        </Box>
      )}
      contentStyle={styles.feed}
      header={header}
      sticky={sticky}
      stickyRows={stickyRows}
      empty={<FeedStandIn state={feed.state} onRetry={feed.retry} empty={empty} />}
      onEndReached={feed.onEndReached}
    />
  );
}
