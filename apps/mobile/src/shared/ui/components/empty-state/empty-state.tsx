import type { DisplayText } from '@huma/contracts';
import { FONT_FAMILIES, FONT_SIZES, LIGHT_THEME, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type EmptyStateProps = Readonly<{ title: DisplayText; message: DisplayText }>;

const styles = createStyles({
  container: { alignItems: 'center', gap: SPACING.xs, padding: SPACING.xl },
  title: { fontSize: FONT_SIZES.lg, fontFamily: FONT_FAMILIES.body.bold, color: LIGHT_THEME.textPrimary },
  message: { fontSize: FONT_SIZES.sm, fontFamily: FONT_FAMILIES.body.regular, color: LIGHT_THEME.textMuted },
});

/** A centred title and message shown where a list has nothing to show. */
export function EmptyState({ title, message }: EmptyStateProps): ReactNode {
  return (
    <Box style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </Box>
  );
}
