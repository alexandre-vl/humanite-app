import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type EmptyStateProps = Readonly<{ title: DisplayText; message: DisplayText }>;

const useStyles = createStyles(() => ({
  container: { alignItems: 'center', gap: SPACING.xs, padding: SPACING.xl },
}));

/** A centred title and message shown where a list has nothing to show. */
export function EmptyState({ title, message }: EmptyStateProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.container}>
      <Text variant="title" heading>
        {title}
      </Text>
      <Text variant="caption">{message}</Text>
    </Box>
  );
}
