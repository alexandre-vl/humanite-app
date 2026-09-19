import type { ArticleId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import { Pressable } from '#primitives/pressable';
import type { PagedFeed } from '../api/queries';
import { usePagedFeed } from '../model/paged-feed';
import type { WireRow as Row } from '../model/wire';
import { rowKey, rowKind, rowPins, wireRows } from '../model/wire';
import { FeedStandIn } from './feed-stand-in';
import { WireDay } from './wire-day';
import { WireHero } from './wire-hero';
import { WireRow } from './wire-row';

export type ArticleWireProps = Readonly<{ query: PagedFeed; onOpen: (id: ArticleId) => void }>;

const useStyles = createStyles(() => ({
  wire: { paddingBottom: SPACING.xl },
  opener: { padding: SPACING.lg },
}));

/**
 * The items of a feed as a running wire: the newest picture, then every item under the head of its day, asking for the
 * next page as the end comes near.
 *
 * The days are worked out over the pages already read rather than page by page: a page holds whatever twelve items the
 * cursor reached, and a day begins and ends wherever it does, never on a page boundary.
 */
export function ArticleWire({ query, onOpen }: ArticleWireProps): ReactNode {
  const styles = useStyles();
  const feed = usePagedFeed(query);
  const rows = wireRows(feed.items);
  const open = (id: ArticleId) => () => {
    onOpen(id);
  };
  const render = (row: Row): ReactNode => {
    switch (row.kind) {
      case 'hero':
        return (
          <Box style={styles.opener}>
            <Pressable onPress={open(row.summary.id)}>
              <WireHero summary={row.summary} />
            </Pressable>
          </Box>
        );
      case 'day':
        return <WireDay label={row.label} />;
      case 'item':
        return (
          <Pressable onPress={open(row.summary.id)}>
            <WireRow summary={row.summary} />
          </Pressable>
        );
    }
  };
  return (
    <List
      items={rows}
      keyOf={rowKey}
      typeOf={rowKind}
      pinned={rowPins}
      renderItem={render}
      contentStyle={styles.wire}
      empty={<FeedStandIn state={feed.state} onRetry={feed.retry} />}
      onEndReached={feed.onEndReached}
    />
  );
}
