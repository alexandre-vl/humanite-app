import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import type { PagedFeed } from '../api/queries';
import { usePagedFeed } from '../model/paged-feed';
import { ArticleCard, shapeOf } from './article-card';
import { FeedStandIn } from './feed-stand-in';

export type ArticleFeedProps = Readonly<{ query: PagedFeed; header?: ReactNode; sticky?: ReactNode }>;

const useStyles = createStyles(() => ({
  feed: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  item: { paddingTop: SPACING.md },
}));

/** A paged feed of articles, under the bands its screen supplies, asking for the next page as the end comes near. */
export function ArticleFeed({ query, header, sticky }: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  const feed = usePagedFeed(query);
  return (
    <List
      items={feed.items}
      keyOf={(summary) => summary.id}
      typeOf={shapeOf}
      renderItem={(summary) => (
        <Box style={styles.item}>
          <ArticleCard summary={summary} />
        </Box>
      )}
      contentStyle={styles.feed}
      header={header}
      sticky={sticky}
      empty={<FeedStandIn state={feed.state} onRetry={feed.retry} />}
      onEndReached={feed.onEndReached}
    />
  );
}
