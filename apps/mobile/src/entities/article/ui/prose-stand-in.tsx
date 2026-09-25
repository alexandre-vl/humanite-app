import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Breathing } from '#primitives/breathing';

const useStyles = createStyles((theme) => ({
  // The column's own margins and the column's own gap: what stands in for the body is laid exactly where the body
  // will be, so the page does not shift its measure when the words arrive.
  column: { paddingHorizontal: SPACING.lg, gap: SPACING.lg },
  // Lines of a paragraph sit closer to each other than paragraphs do, as they do when they are words.
  paragraph: { gap: SPACING.sm },
  line: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  row: { flexDirection: 'row' },
  // A paragraph's last line stops short, which is the one thing that makes a block of bars read as prose rather than
  // as a form. Two lengths, so three paragraphs do not all stop in the same place.
  nearly: { flex: 4, height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  halfway: { flex: 5, height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  rest: { flex: 3 },
}));

/**
 * The three paragraphs, written out line by line rather than counted.
 *
 * Each line is named, because a list drawn from a count has nothing to key its items by but their place in it, and a
 * key that is a place is a key that moves. Nothing here ever reorders — but the rule that says so is worth keeping,
 * and the shape of the ghost is easier to read written down than derived.
 */
const PARAGRAPHS = [
  { lines: ['a1', 'a2', 'a3', 'a4'], stops: 'nearly' },
  { lines: ['b1', 'b2', 'b3', 'b4', 'b5'], stops: 'halfway' },
  { lines: ['c1', 'c2', 'c3'], stops: 'nearly' },
] as const;

/**
 * What stands where an article's body will be, while the body is on its way.
 *
 * It is shaped like prose and not like a list: lines at the measure the words will have, closer to each other inside
 * a paragraph than between two, and a last line that stops short of the margin. The nine bars that used to stand
 * here were the same nine that stand in for a feed, so a screen opened on an article said nothing about what was
 * coming — and a reader who has just touched a headline is owed the shape of the thing they touched.
 *
 * It breathes, because a block of grey that does not move reads as a page that has finished and has nothing on it.
 *
 * Nothing here is announced. The head above it carries the title, the standfirst and the signature, all of them real
 * and all of them already read out; this is the ghost of a paragraph nobody has yet, and a screen reader that stopped
 * to describe it would be reading out furniture.
 */
export function ProseStandIn(): ReactNode {
  const styles = useStyles();
  return (
    <Breathing style={styles.column}>
      {PARAGRAPHS.map((paragraph) => (
        <Box key={paragraph.lines[0]} style={styles.paragraph}>
          {paragraph.lines.map((line) => (
            <Box key={line} style={styles.line} />
          ))}
          <Box style={styles.row}>
            <Box style={paragraph.stops === 'nearly' ? styles.nearly : styles.halfway} />
            <Box style={styles.rest} />
          </Box>
        </Box>
      ))}
    </Breathing>
  );
}
