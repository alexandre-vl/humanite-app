import type { ArticleId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { List } from '#primitives/list';
import { Pressable } from '#primitives/pressable';
import type { ReadFeed } from '../model/paged-feed';
import type { SectionNames } from '../model/section-names';
import type { WireRow as Row } from '../model/wire';
import { rowKey, rowKind, rowPins, wireRows } from '../model/wire';
import { FeedStandIn } from './feed-stand-in';
import { WireDay } from './wire-day';
import { WireRow } from './wire-row';

export type ArticleWireProps = Readonly<{
  feed: ReadFeed;
  /** What the newsroom calls the section each item ran in, asked once by the screen and handed down with every row. */
  names: SectionNames;
  onOpen: (id: ArticleId) => void;
}>;

const useStyles = createStyles(() => ({
  wire: { paddingBottom: SPACING.xl },
}));

/**
 * The items of a feed as a running wire: every item under the head of its day, asking for the next page as the end
 * comes near, and reading the feed again when the reader pulls it down.
 *
 * The days are worked out over the pages already read rather than page by page: a page holds whatever items the cursor
 * reached, and a day begins and ends wherever it does, never on a page boundary.
 *
 * Pulling to refresh is the one gesture a screen called En continu owes a reader, and the screen it replaces has it.
 * What it asks for is the first page again, so a wire that has been read four pages deep comes back to its newest.
 */
export function ArticleWire({ feed, names, onOpen }: ArticleWireProps): ReactNode {
  const styles = useStyles();
  const rows = wireRows(feed.items);
  const open = (id: ArticleId) => () => {
    onOpen(id);
  };
  const render = (row: Row): ReactNode => {
    switch (row.kind) {
      case 'day':
        return <WireDay label={row.label} />;
      case 'item':
        return (
          <Pressable role="link" onPress={open(row.summary.id)}>
            <WireRow summary={row.summary} name={names(row.summary.section)} />
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
      refreshing={feed.refreshing}
      onRefresh={feed.refresh}
    />
  );
}
