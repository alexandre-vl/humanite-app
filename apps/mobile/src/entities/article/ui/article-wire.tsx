import type { ArticleId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { List } from '#primitives/list';
import { Pressable } from '#primitives/pressable';
import { prefetchArticle } from '../api/queries';
import type { ReadFeed } from '../model/paged-feed';
import type { WireRow as Row } from '../model/wire';
import { rowKey, rowKind, rowPins, wireRows } from '../model/wire';
import { FeedStandIn } from './feed-stand-in';
import { WireDay } from './wire-day';
import { WireStandIn } from './wire-stand-in';
import { WireRow } from './wire-row';

export type ArticleWireProps = Readonly<{
  feed: ReadFeed;
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
 * reached, and a day begins and ends wherever it does, never on a page boundary. Both sources answer the wire in a
 * single page today — no capture has shown the service's second — and the contract keeps it paged, so a source that
 * pages it is read on to its end rather than cut at its first page.
 *
 * Pulling to refresh is the one gesture a screen called En continu owes a reader, and the screen it replaces has it.
 * It reads every page the wire holds again, from the first, so the newest item is back at the top wherever the reader
 * had scrolled to.
 */
export function ArticleWire({ feed, onOpen }: ArticleWireProps): ReactNode {
  const styles = useStyles();
  const rows = wireRows(feed.items);
  // Asked for the moment a finger lands, not when the screen it opens mounts: the press, the lift and the slide are
  // together a few hundred milliseconds, and so is an article the service has not served lately. It is done in the
  // list rather than handed down from a screen because the list and the reading share one slice — the card knows
  // which article it draws, and four screens would otherwise each pass the same line for a thing none of them decides.
  const cache = useQueryClient();
  const open = (id: ArticleId) => () => {
    onOpen(id);
  };
  const render = (row: Row): ReactNode => {
    switch (row.kind) {
      case 'day':
        return <WireDay label={row.label} />;
      case 'item':
        return (
          <Pressable
            role="link"
            onPress={open(row.summary.id)}
            onPressIn={() => {
              prefetchArticle(cache, row.summary.id);
            }}
          >
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
      empty={<FeedStandIn state={feed.state} onRetry={feed.readAgain} awaited={<WireStandIn />} />}
      onEndReached={feed.onEndReached}
      refreshing={feed.refreshing}
      onRefresh={feed.readAgain}
    />
  );
}
