import { ANGLES, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { ThemeScope } from '../../primitives/theme';

export type PaperProps = Readonly<{ children?: ReactNode }>;

const useStyles = createStyles((theme) => ({
  sheet: {
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADII.sm,
    backgroundColor: theme.ground,
    transform: [{ rotate: ANGLES.paper }],
  },
}));

/** The sheet itself, built inside the scope so its ground is the light theme's and not the reader's. */
function Sheet({ children }: PaperProps): ReactNode {
  const styles = useStyles();
  return <Box style={styles.sheet}>{children}</Box>;
}

/**
 * A torn piece of newsprint dropped on the page: laid at the angle the journal lays its paper at, and always light,
 * whatever the page under it. The current app prints the linked card and the support callout this way, and prints them
 * light on the dark ground of a video article too — paper is paper, whichever page it lands on.
 */
export function Paper({ children }: PaperProps): ReactNode {
  return (
    <ThemeScope name="light">
      <Sheet>{children}</Sheet>
    </ThemeScope>
  );
}
