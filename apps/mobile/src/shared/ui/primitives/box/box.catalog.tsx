import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Box } from './box';

const useStyles = createStyles((theme) => ({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: theme.primary },
}));

function BoxDemo(): ReactNode {
  const styles = useStyles();
  return <Box style={styles.demo} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Box'),
  render: () => <BoxDemo />,
};
