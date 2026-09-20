import type { ArticleId, ArticleSummary } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import { Pressable } from '#primitives/pressable';
import { authorsQuery } from '../api/queries';
import { bylineOf } from '../model/byline';
import type { ReadFeed } from '../model/paged-feed';
import type { FeedRhythm, FeedRow } from '../model/rhythm';
import { feedRows, rowName, rowShape } from '../model/rhythm';
import { ArticleCard } from './article-card';
import type { EmptyWords } from './feed-stand-in';
import { FeedStandIn } from './feed-stand-in';

export type ArticleFeedProps = Readonly<{
  feed: ReadFeed;
  rhythm: FeedRhythm;
  onOpen: (id: ArticleId) => void;
  action?: ((summary: ArticleSummary) => ReactNode) | undefined;
  header?: ReactNode;
  sticky?: ReactNode;
  stickyRows?: 1 | 2 | undefined;
  empty?: EmptyWords | undefined;
}>;

const useStyles = createStyles((theme) => ({
  feed: { paddingBottom: SPACING.xxxl },
  // A card is printed on the ground of its block and carries no ground of its own: the block is what the reader
  // sees, and a card drawn as a tile on top of it would be a second ground inside the first (captures 18, 19).
  cardPaper: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: theme.background },
  cardLifted: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: theme.block },
  underPaper: { backgroundColor: theme.background },
  underLifted: { backgroundColor: theme.block },
  // The seam is the incoming ground rising over the outgoing one, rounded at one corner. The page's own ground turns
  // at its left, as the current app's white block does (capture 19), and the other turns at its right — so the page
  // zigzags down. The corner can follow the ground because the two strictly alternate, which is what keeps this to
  // two entries rather than one per ground and per side.
  joinPaper: { height: SPACING.xxl, backgroundColor: theme.background, borderTopLeftRadius: RADII.sheet },
  joinLifted: { height: SPACING.xxl, backgroundColor: theme.block, borderTopRightRadius: RADII.sheet },
}));

/**
 * A paged feed of articles, laid out in the rhythm its screen reads in, under the bands its screen supplies, asking
 * for the next page as the end comes near.
 *
 * It reports which article was pressed and goes nowhere itself: an entity may not name a route, and the screen that
 * mounts the feed is the one that knows what opening an article means for it. What it does not take from the screen
 * is the shape of a card: that is the feed's own, decided once for every item at a time when their order is known.
 *
 * The newsroom's roster is asked for here rather than by a column's card. A cell is mounted and thrown away as the
 * reader scrolls, and a list that asked once per cell would ask again at every turn of the page; the roster is the
 * paper's own list and never goes stale, so one ask serves every column on screen — and serves the article screen
 * too, which needs the same names the moment a card is pressed.
 */
export function ArticleFeed({
  feed,
  rhythm,
  onOpen,
  action,
  header,
  sticky,
  stickyRows,
  empty,
}: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  const roster = useQuery(authorsQuery).data ?? [];
  const render = (row: FeedRow): ReactNode => {
    if (row.kind === 'seam') {
      return (
        <Box style={row.ground === 'paper' ? styles.underLifted : styles.underPaper}>
          <Box style={row.ground === 'paper' ? styles.joinPaper : styles.joinLifted} />
        </Box>
      );
    }
    return (
      <Box style={row.ground === 'paper' ? styles.cardPaper : styles.cardLifted}>
        <Pressable
          onPress={() => {
            onOpen(row.summary.id);
          }}
        >
          <ArticleCard
            shape={row.shape}
            summary={row.summary}
            action={action?.(row.summary)}
            signature={row.shape === 'column' ? bylineOf(row.summary.authors, roster) : null}
          />
        </Pressable>
      </Box>
    );
  };
  return (
    <List
      items={feedRows(feed.items, rhythm)}
      keyOf={rowName}
      typeOf={rowShape}
      renderItem={render}
      contentStyle={styles.feed}
      header={header}
      sticky={sticky}
      stickyRows={stickyRows}
      empty={<FeedStandIn state={feed.state} onRetry={feed.retry} empty={empty} />}
      onEndReached={feed.onEndReached}
    />
  );
}
