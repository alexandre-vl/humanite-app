import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
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
  name: catalogLabel('Box'),
  render: () => <BoxDemo />,
};
