import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Breathing } from '#primitives/breathing';
import type { CardShape, FeedRhythm } from '../model/rhythm';
import { CardStandIn } from './card-stand-in';

const useStyles = createStyles((theme) => ({
  // The frame of a row of the feed, which is article-feed.tsx's own: the same margins and the same hairline where one
  // card gives way to the next. A stand-in framed differently would have the rules move the moment the cards land.
  card: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.rule,
  },
}));

/**
 * The shapes a page of the paper opens on, and the shapes a list runs in.
 *
 * They are the rhythms themselves, read off `shapeAt`: a page of the paper opens on one article in full, runs the
 * next on lines and raises the fourth; a list raises nothing. Five rows, which is about a screenful on the phone —
 * enough that the page reads as a page, few enough that nothing is drawn below the fold a reader will never see
 * before the answer lands.
 *
 * Each row is named, and the name is what the list of rows is keyed by.
 */
const RHYTHMS = {
  paper: [
    { name: 'p1', shape: 'opening' },
    { name: 'p2', shape: 'line' },
    { name: 'p3', shape: 'line' },
    { name: 'p4', shape: 'lead' },
    { name: 'p5', shape: 'line' },
  ],
  list: [
    { name: 'l1', shape: 'line' },
    { name: 'l2', shape: 'line' },
    { name: 'l3', shape: 'line' },
    { name: 'l4', shape: 'line' },
    { name: 'l5', shape: 'line' },
  ],
} as const satisfies Readonly<Record<FeedRhythm, readonly Readonly<{ name: string; shape: CardShape }>[]>>;

/**
 * What stands in a feed's place while the feed is on its way: the cards it is about to hold, in the rhythm its screen
 * reads in, in their own frames and under their own rules.
 *
 * What stood here before was nine identical bars, the same nine on every screen of the app — so a reader opening
 * « À la une » and a reader opening a section were told the same nothing, and neither was told anything about what
 * they had asked for. What a stand-in is for is the opposite of that: the page a reader is about to get, drawn empty,
 * so that the wait is spent looking at its shape and the words land into a layout that is already there.
 *
 * It breathes as one thing rather than card by card. Bars that pulsed out of step would read as a list of items each
 * doing something of its own, which is exactly what a page waiting on a single answer is not.
 */
export function FeedCardsStandIn({ rhythm }: Readonly<{ rhythm: FeedRhythm }>): ReactNode {
  const styles = useStyles();
  return (
    <Breathing>
      {RHYTHMS[rhythm].map((row) => (
        <Box key={row.name} style={styles.card}>
          <CardStandIn shape={row.shape} />
        </Box>
      ))}
    </Breathing>
  );
}
