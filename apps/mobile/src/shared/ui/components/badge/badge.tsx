import type { DisplayText } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';
import { ThemeScope } from '../../primitives/theme';

export type BadgeProps = Readonly<{ label: DisplayText }>;

const useStyles = createStyles((theme) => ({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: theme.premium,
  },
}));

/** The mark itself, built inside the scope so both its yellow and the text on it are the light theme's. */
function Mark({ label }: BadgeProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.badge}>
      {/* Set in the type of the word it stands beside, which is the smallest the paper sets anything in. It was set
          two points larger and in lower case, so a filled block of yellow was the loudest thing on a front page of
          headlines — and what it says is worth knowing before pressing a card, not instead of reading it. */}
      <Text variant="kicker" tone="textPrimary">
        {label}
      </Text>
    </Box>
  );
}

/**
 * A small status marker, such as the premium tag on an item — always light, whatever the page under it.
 *
 * The yellow is the same value in both themes, so like the paper's red it cannot ask for two different texts on it.
 * Read in the reader's theme it took the dark theme's own text: pale grey on yellow, measured at 1.30 to 1 on an
 * A065, a word painted in a colour nobody can read it in. Named light, it takes the aubergine the light theme writes
 * in and the mark reads the same on every page — the way a torn piece of newsprint does.
 */
export function Badge({ label }: BadgeProps): ReactNode {
  return (
    <ThemeScope name="light">
      <Mark label={label} />
    </ThemeScope>
  );
}
