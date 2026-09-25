import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';

/**
 * The weight of line a ghost draws, named by the text it stands for and not by a count of points.
 *
 * Each is the bar a line of that text leaves behind: `lead` for the title of a card the page raises, `title` for the
 * title of a card in a line, `small` for everything set under a title — a standfirst, an hour, a word saying what an
 * item is. The three heights are a grid step apart, which is the same distance the three text sizes are apart, so a
 * ghost of a card reads with the hierarchy the card has.
 */
type GhostWeight = 'lead' | 'title' | 'small';

/**
 * How far the last line of a block runs.
 *
 * A block of bars all of one length reads as a form. Prose does not end at the margin, so the last line stops short,
 * and two lengths are offered so that two blocks on one screen do not stop in the same place.
 */
type GhostStop = 'nearly' | 'halfway';

export type GhostLinesProps = Readonly<{
  /**
   * One name per line, the last of which stops short.
   *
   * They are named and not counted because a list drawn from a count has nothing to key its items by but their place
   * in it, and a key that is a place is a key that moves.
   */
  lines: readonly string[];
  weight: GhostWeight;
  stops?: GhostStop | undefined;
}>;

const useStyles = createStyles((theme) => ({
  leadStack: { gap: SPACING.sm },
  titleStack: { gap: SPACING.sm },
  smallStack: { gap: SPACING.xs },
  lead: { height: SPACING.lg, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  title: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  small: { height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  row: { flexDirection: 'row' },
  // The last line and the margin it stops short of, as a pair of shares rather than a width: a style of this app
  // carries tokens and no percentages, and a share is the one measure that holds at any screen.
  leadNearly: { flex: 4, height: SPACING.lg, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  leadHalfway: { flex: 5, height: SPACING.lg, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  titleNearly: { flex: 4, height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  titleHalfway: { flex: 5, height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  smallNearly: { flex: 4, height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  smallHalfway: { flex: 5, height: SPACING.sm, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  nearlyRest: { flex: 1 },
  halfwayRest: { flex: 3 },
}));

type Styles = ReturnType<typeof useStyles>;

const STACKS = { lead: 'leadStack', title: 'titleStack', small: 'smallStack' } as const;
const BARS = { lead: 'lead', title: 'title', small: 'small' } as const;
const LASTS = {
  lead: { nearly: 'leadNearly', halfway: 'leadHalfway' },
  title: { nearly: 'titleNearly', halfway: 'titleHalfway' },
  small: { nearly: 'smallNearly', halfway: 'smallHalfway' },
} as const satisfies Readonly<Record<GhostWeight, Readonly<Record<GhostStop, keyof Styles>>>>;
const RESTS = { nearly: 'nearlyRest', halfway: 'halfwayRest' } as const;

/**
 * A block of bars standing where lines of text will be, at the weight of the text they stand for.
 *
 * Given a stop, the last bar runs short of the margin and the rest of the line is left empty, which is the one thing
 * that makes a block of bars read as words rather than as a form. Given none, every bar runs the full measure, which
 * is what a single line wants — an hour, a word over a title — since a lone bar stopping short reads as a bar that
 * was cut off.
 *
 * Nothing here is announced. It is the ghost of text nobody has yet, and a screen reader stopping to describe it
 * would be reading out furniture; what the screen has to say while it waits is said by the screen, in words.
 */
export function GhostLines({ lines, weight, stops }: GhostLinesProps): ReactNode {
  const styles = useStyles();
  const [last, ...rest] = [...lines].reverse();
  const full = rest.reverse();
  return (
    <Box style={styles[STACKS[weight]]}>
      {full.map((line) => (
        <Box key={line} style={styles[BARS[weight]]} />
      ))}
      {last === undefined ? null : stops === undefined ? (
        <Box key={last} style={styles[BARS[weight]]} />
      ) : (
        <Box key={last} style={styles.row}>
          <Box style={styles[LASTS[weight][stops]]} />
          <Box style={styles[RESTS[stops]]} />
        </Box>
      )}
    </Box>
  );
}
