import type { DisplayText } from '@huma/contracts';
import { FONT_FAMILIES, FONT_SIZES, LIGHT_THEME, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Text } from '../../primitives/text';

export type SectionTitleProps = Readonly<{ title: DisplayText }>;

const styles = createStyles({
  container: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONT_SIZES.lg, fontFamily: FONT_FAMILIES.display, color: LIGHT_THEME.textPrimary },
});

/** A section heading in the display face, such as a rubric name above its cards. */
export function SectionTitle({ title }: SectionTitleProps): ReactNode {
  return (
    <Box style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </Box>
  );
}
