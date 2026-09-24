import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { GhostLines } from '#components/ghost';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Breathing } from '#primitives/breathing';
import { FRAMES } from '../model/picture';
import { ProseStandIn } from './prose-stand-in';

const useStyles = createStyles((theme) => ({
  page: { paddingVertical: SPACING.lg, gap: SPACING.lg },
  // The head's own measure, article-lead.tsx's: one margin for everything that is read on this page.
  head: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  // The picture runs edge to edge, as the article's does, and is held open at its own ratio so the body below it
  // does not climb the screen and get pushed back down when it lands.
  photo: { alignSelf: 'stretch', aspectRatio: FRAMES.photo, backgroundColor: theme.card },
}));

/**
 * What stands where a whole article will be, when the app knows nothing of it yet.
 *
 * This is the opening of an article reached by a link rather than by touching a card: nothing of it is in hand, not
 * even a title, so the head is a ghost like the body. A reader arriving from a list never sees this — the card they
 * touched carries the title, the standfirst and the signature, and those are drawn for real while only the body
 * waits, which is the page `ArticleReader` draws instead.
 *
 * It is shaped like an article and not like a feed: a headline over three lines, a signature under it, the picture,
 * then prose. The nine identical bars that stood here said nothing about what was coming, on a screen where what is
 * coming is the most predictable thing in the app.
 *
 * The head breathes beside the body rather than around it. `ProseStandIn` carries its own breath, being drawn alone
 * on the page a reader reaches from a list, and one breath laid over another multiplies the two: what should fade to
 * 45 per cent would fade to 20, which is a page going dark rather than a page waiting. Side by side they are one
 * breath, since both are drawn in the frame the screen mounted in.
 */
export function ArticleStandIn(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.page}>
      <Breathing style={styles.head}>
        <GhostLines lines={['t1', 't2', 't3']} weight="lead" stops="halfway" />
        <GhostLines lines={['m1']} weight="small" />
      </Breathing>
      <Breathing style={styles.photo} />
      <ProseStandIn />
    </Box>
  );
}
