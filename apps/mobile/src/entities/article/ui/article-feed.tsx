import type { ArticleId, ArticleSummary } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { List } from '#primitives/list';
import { prefetchPicture } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { prefetchArticle } from '../api/queries';
import { signatureOf } from '../model/byline';
import type { ReadFeed } from '../model/paged-feed';
import type { FeedRhythm, FeedRow } from '../model/rhythm';
import { feedRows, rowName, rowShape } from '../model/rhythm';
import { ArticleCard } from './article-card';
import type { EmptyWords } from './feed-stand-in';
import { FeedCardsStandIn } from './feed-cards-stand-in';
import { FeedFooter } from './feed-footer';
import { FeedStandIn } from './feed-stand-in';

export type ArticleFeedProps = Readonly<{
  feed: ReadFeed;
  rhythm: FeedRhythm;
  onOpen: (id: ArticleId) => void;
  action?: ((summary: ArticleSummary) => ReactNode) | undefined;
  header?: ReactNode;
  empty?: EmptyWords | undefined;
  /**
   * What the screen sets above the first card, in the run of the cards: a word it has for the reader, such as how
   * much the wire holds that it has not shown them. It is a row of the list and not a band over it, so it arrives the
   * way a card arrives — a reader who has scrolled keeps their place, and a reader at the top is shown it.
   */
  notice?: ReactNode | undefined;
}>;

/** A line of the list: a card, or the notice the screen sets above the first one. */
type Line = Readonly<{ kind: 'card'; row: FeedRow }> | Readonly<{ kind: 'notice' }>;

const NOTICE: Line = { kind: 'notice' };

/** What the list keys a line by, and which tree it mounts: the notice has its own, never a card's. */
const lineKey = (line: Line): string => (line.kind === 'notice' ? NOTICE.kind : rowName(line.row));
const lineType = (line: Line): string => (line.kind === 'notice' ? NOTICE.kind : rowShape(line.row));

const useStyles = createStyles((theme) => ({
  feed: { paddingBottom: SPACING.xxxl },
  // One ground, and a rule where one card gives way to the next. The feed alternated two grounds every three cards,
  // with a corner rounded over the seam between them; none of the four fronts measured does anything of the sort —
  // the Guardian, the BBC, Le Monde and NPR all print one ground and separate with a hairline. What the band was
  // actually saying is what NN/g calls the illusion of completeness: a contrasting full-width edge reads as the
  // bottom of the page, and a reader stops scrolling at it.
  card: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.rule,
    backgroundColor: theme.background,
  },
}));

/**
 * A paged feed of articles, laid out in the rhythm its screen reads in, under the band its screen supplies, asking
 * for the next page as the end comes near.
 *
 * It reports which article was pressed and goes nowhere itself: an entity may not name a route, and the screen that
 * mounts the feed is the one that knows what opening an article means for it. What it does not take from the screen
 * is the shape of a card: that is the feed's own, decided once for every item at a time when their order is known.
 *
 * A column announces its writer and nothing else does, which is why the signature is read here and not by the card:
 * a card is handed what it draws.
 */
export function ArticleFeed({ feed, rhythm, onOpen, action, header, empty, notice }: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  // Asked for the moment a finger lands, not when the screen it opens mounts: the press, the lift and the slide are
  // together a few hundred milliseconds, and so is an article the service has not served lately. It is done in the
  // list rather than handed down from a screen because the list and the reading share one slice — the card knows
  // which article it draws, and four screens would otherwise each pass the same line for a thing none of them decides.
  const cache = useQueryClient();
  const render = (row: FeedRow): ReactNode => (
    <Box style={styles.card}>
      {/* No label: a card's own words are its name, and they are better than any summary of them — what it is, its
          title and whatever it prints under it are read in one breath, and the next swipe is the next article. */}
      <Pressable
        role="link"
        onPress={() => {
          onOpen(row.summary.id);
        }}
        onPressIn={() => {
          prefetchArticle(cache, row.summary.id);
          const head = pictureOf(row.summary, 'lead');
          prefetchPicture(head?.standingIn ?? null);
          prefetchPicture(head?.source ?? null);
        }}
      >
        <ArticleCard
          shape={row.shape}
          summary={row.summary}
          action={action?.(row.summary)}
          signature={row.shape === 'column' ? signatureOf(row.summary) : null}
        />
      </Pressable>
    </Box>
  );
  const cards = feedRows(feed.items, rhythm).map((row): Line => ({ kind: 'card', row }));
  // Over cards only: a feed with none shows what stands in for them, and a notice over nothing would hide it.
  const lines = notice === undefined || cards.length === 0 ? cards : [NOTICE, ...cards];
  const renderLine = (line: Line): ReactNode => (line.kind === 'notice' ? <>{notice}</> : render(line.row));
  return (
    <List
      items={lines}
      keyOf={lineKey}
      typeOf={lineType}
      renderItem={renderLine}
      contentStyle={styles.feed}
      header={header}
      empty={
        <FeedStandIn
          state={feed.state}
          onRetry={feed.readAgain}
          awaited={<FeedCardsStandIn rhythm={rhythm} />}
          empty={empty}
        />
      }
      // A feed with no next part to ask for is asked again whole: what failed under articles standing in for an answer
      // is the answer itself.
      footer={<FeedFooter foot={feed.foot} onRetry={feed.onEndReached ?? feed.readAgain} />}
      onEndReached={feed.onEndReached}
      refreshing={feed.refreshing}
      onRefresh={feed.readAgain}
    />
  );
}
