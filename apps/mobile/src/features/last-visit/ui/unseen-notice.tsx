import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { counted } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Text } from '#primitives/text';
import type { Unseen } from '../model/unseen';

export type UnseenNoticeProps = Readonly<{
  unseen: Unseen;
  /** Going to the wire, which the screen that sets the notice knows how to reach. */
  onPress: () => void;
}>;

const useStyles = createStyles((theme) => ({
  // Set in as the cards are, and hugging its words: a pill and not a band across the page.
  row: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, alignItems: 'flex-start' },
  // Round at the ends at the phone's own text size, where it stands one line tall, and a rounded box past it. Rounded
  // all the way at every size, three lines of the phone's largest text stood in an oval that ran into their first
  // letters (iPhone simulator, 25/09/2026).
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: SIZES.stroke,
    borderColor: theme.rule,
  },
  // The words give way and wrap, and never the marks either side of them: in a row nothing shrinks unless told to,
  // and at the phone's largest text the pill ran 418 points wide off a 402-point screen, its chevron with it.
  words: { flexShrink: 1 },
}));

/**
 * The pill above the front page that says how much the wire holds that it has not shown the reader, and takes them
 * there: « 12 nouveaux articles en continu ».
 *
 * It opens the front's run rather than standing over the screen. Set above the masthead's band, it would have pushed
 * the whole page down the moment the wire's count arrived, under the eyes of a reader already reading; in the run, it
 * arrives the way a card that has just come in arrives — the list keeps a reader who has scrolled where they were, and
 * shows a reader at the top what is new.
 *
 * The bolt is the wire's own mark, the one its tab carries, and the only red: the words are in the ink, the red being
 * proven as a letter at no size this small.
 */
export function UnseenNotice({ unseen, onPress }: UnseenNoticeProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const words = counted(unseen.atLeast ? 'live.unseen.atLeast' : 'live.unseen', unseen.count);
  return (
    <Box style={styles.row}>
      <Pressable style={styles.pill} role="link" label={words} hitSlop={SPACING.sm} onPress={onPress}>
        <Icon name="live" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.primary} />
        <Box style={styles.words}>
          <Text variant="label">{words}</Text>
        </Box>
        <Icon name="next" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.textMuted} />
      </Pressable>
    </Box>
  );
}
