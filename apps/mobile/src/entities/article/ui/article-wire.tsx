import type { ArticleId, Instant } from '@huma/contracts';
import { instantOf, issueIdAt } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { t } from '#i18n';
import { useNow } from '#lib/format';
import { createStyles } from '#lib/styles';
import { List } from '#primitives/list';
import { prefetchPicture } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { prefetchArticle } from '../api/queries';
import type { ReadFeed } from '../model/paged-feed';
import type { WireRow as Row } from '../model/wire';
import { rowKey, rowKind, rowPins, wireRows } from '../model/wire';
import { FeedStandIn } from './feed-stand-in';
import { WireDay } from './wire-day';
import { WireFooter } from './wire-footer';
import { WireStandIn } from './wire-stand-in';
import { WireRow } from './wire-row';

export type ArticleWireProps = Readonly<{
  feed: ReadFeed;
  onOpen: (id: ArticleId) => void;
  /**
   * The newest item the wire had shown when the reader last came to it: every item filed after it is new to them, and
   * says so. Nothing on a first visit, and nothing on a screen that keeps no visits.
   */
  since?: Instant | null;
}>;

/** What the foot asks again with when the feed has no next part to ask for: nothing. */
const nothing = (): void => undefined;

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
 *
 * Under the last item stands the foot: the next part on its way, named by its day, or the failure to fetch it.
 */
export function ArticleWire({ feed, onOpen, since = null }: ArticleWireProps): ReactNode {
  const styles = useStyles();
  // One clock for the whole list, ticking once a minute, so the ages on the rows a reader can see stay true while
  // they read. Read here and not in the row: a hundred rows would be a hundred subscriptions to the same minute.
  const now = useNow();
  // The day the reader is reading on, read off that same clock: a wire left open over midnight renames its heads with
  // the first tick of the new day, today's becoming yesterday's.
  const rows = wireRows(feed.items, issueIdAt(instantOf(now)), since);
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
      case 'standIn':
        return <FeedStandIn state={feed.state} onRetry={feed.readAgain} awaited={<WireStandIn />} />;
      case 'day':
        return <WireDay label={row.label} />;
      case 'item':
        return (
          <Pressable
            role="link"
            status={row.fresh ? t('live.fresh') : undefined}
            onPress={open(row.summary.id)}
            onPressIn={() => {
              prefetchArticle(cache, row.summary.id);
              const head = pictureOf(row.summary, 'lead');
              prefetchPicture(head?.standingIn ?? null);
              prefetchPicture(head?.source ?? null);
            }}
          >
            <WireRow summary={row.summary} fresh={row.fresh} now={now} />
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
      footer={<WireFooter foot={feed.foot} onRetry={feed.onEndReached ?? nothing} />}
      onEndReached={feed.onEndReached}
      refreshing={feed.refreshing}
      onRefresh={feed.readAgain}
    />
  );
}
