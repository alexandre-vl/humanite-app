import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { Paper } from '#components/paper';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type ArticleCalloutProps = Readonly<{ title: DisplayText; text: DisplayText; button: DisplayText }>;

const useStyles = createStyles(() => ({
  block: { paddingHorizontal: SPACING.xl },
  action: { alignItems: 'flex-start', paddingTop: SPACING.xs },
}));

/**
 * The call for support an article carries, on a piece of paper like the linked card, and narrower than the column —
 * measured on capture 16 at 903 points against the column's 1006.
 *
 * It carries its button. The capture shows none, and the reference document lists that as a fault: an appeal with
 * nothing to press is an appeal that cannot be answered. The contract has carried the button's words all along.
 */
export function ArticleCallout({ title, text, button }: ArticleCalloutProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.block}>
      <Paper>
        <Text variant="headline">{title}</Text>
        <Text variant="prose">{text}</Text>
        <Box style={styles.action}>
          <Button label={button} />
        </Box>
      </Paper>
    </Box>
  );
}
