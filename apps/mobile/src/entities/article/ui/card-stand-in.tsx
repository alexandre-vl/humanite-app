import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { GhostLines } from '#components/ghost';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { FRAMES } from '../model/picture';
import type { CardShape } from '../model/rhythm';

/** The square the small picture of a card in a line is cut to, as the card cuts it. */
const THUMBNAIL_RATIO = 1;

const useStyles = createStyles((theme) => ({
  // Every measure here is the card's own, taken from article-card.tsx rather than chosen again: the ghost stands
  // exactly where the card will, so the page does not move when the words arrive. A ghost laid out to its own taste
  // is a page that jumps, which is the one thing a stand-in exists to prevent.
  card: { gap: SPACING.sm },
  photo: {
    alignSelf: 'stretch',
    aspectRatio: FRAMES.photo,
    borderRadius: RADII.sm,
    backgroundColor: theme.card,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  rest: { flex: 1 },
  thumbnail: {
    width: SIZES.thumbnail,
    aspectRatio: THUMBNAIL_RATIO,
    borderRadius: RADII.sm,
    backgroundColor: theme.card,
  },
  column: { flexDirection: 'row', gap: SPACING.md },
  // The rule down a column's side, in the grey of the ghost and not in the paper's red: the red is a mark that says
  // this piece is an opinion, and a ghost knows nothing about the piece it stands for.
  mark: { width: SIZES.stroke, alignSelf: 'stretch', backgroundColor: theme.card },
  // What closes a card is a date and a word or two, never a full line, so the foot is a short bar and the room it
  // leaves — which is where the control a reader presses will be.
  foot: { flexDirection: 'row' },
  when: { flex: 2, height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.card },
  spare: { flex: 5 },
}));

/** What closes a ghost card, in the place a date and an access word take on a real one. */
function Foot(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.foot}>
      <Box style={styles.when} />
      <Box style={styles.spare} />
    </Box>
  );
}

/**
 * The ghost of one card, in the shape the feed's rhythm would have given it.
 *
 * It is drawn shape by shape and not as one block of bars for the same reason the cards are: what separates the five
 * shapes — how much room the picture takes, how large the title is set, whether a standfirst follows — is the page's
 * hierarchy, and a stand-in that flattened it would tell a reader the page is a list of equals while the page being
 * fetched is not. A reader who has just opened a section can see, before a word of it arrives, that the first item
 * is raised and the rest run in lines.
 *
 * It carries no picture and no thumbhash: there is no article yet, so there is nothing to blur. The box the picture
 * will fill is held open at the picture's own ratio, which is what keeps the title from climbing the screen and then
 * being pushed back down.
 */
export function CardStandIn({ shape }: Readonly<{ shape: CardShape }>): ReactNode {
  const styles = useStyles();
  switch (shape) {
    case 'opening':
      return (
        <Box style={styles.card}>
          <Box style={styles.photo} />
          <GhostLines lines={['o1', 'o2']} weight="lead" stops="nearly" />
          <GhostLines lines={['os1', 'os2']} weight="small" stops="halfway" />
          <Foot />
        </Box>
      );
    case 'lead':
      return (
        <Box style={styles.card}>
          <Box style={styles.photo} />
          <GhostLines lines={['l1', 'l2']} weight="lead" stops="halfway" />
          <Foot />
        </Box>
      );
    case 'line':
      return (
        <Box style={styles.card}>
          <Box style={styles.line}>
            <Box style={styles.rest}>
              <GhostLines lines={['n1', 'n2', 'n3']} weight="title" stops="nearly" />
            </Box>
            <Box style={styles.thumbnail} />
          </Box>
          <Foot />
        </Box>
      );
    case 'column':
      return (
        <Box style={styles.column}>
          <Box style={styles.mark} />
          <Box style={styles.rest}>
            <Box style={styles.card}>
              <GhostLines lines={['c1', 'c2']} weight="title" stops="halfway" />
              <Foot />
            </Box>
          </Box>
        </Box>
      );
    case 'brief':
      return (
        <Box style={styles.card}>
          <GhostLines lines={['b1', 'b2']} weight="title" stops="nearly" />
          <Foot />
        </Box>
      );
  }
}
