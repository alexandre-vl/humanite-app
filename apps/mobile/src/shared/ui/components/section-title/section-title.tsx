import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type SectionTitleProps = Readonly<{ title: DisplayText }>;

const useStyles = createStyles(() => ({
  container: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
}));

/** A section heading in the display face, such as a rubric name above its cards. */
export function SectionTitle({ title }: SectionTitleProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.container}>
      <Text variant="display">{title}</Text>
    </Box>
  );
}
