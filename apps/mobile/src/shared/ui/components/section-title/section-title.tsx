import type { DisplayText } from '@huma/contracts';
import { FONT_FAMILIES, FONT_SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type SectionTitleProps = Readonly<{ title: DisplayText }>;

const useStyles = createStyles((theme) => ({
  container: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONT_SIZES.lg, fontFamily: FONT_FAMILIES.display, color: theme.textPrimary },
}));

/** A section heading in the display face, such as a rubric name above its cards. */
export function SectionTitle({ title }: SectionTitleProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </Box>
  );
}
