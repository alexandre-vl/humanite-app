import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Surface } from './surface';

const useStyles = createStyles((theme) => ({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: theme.card },
}));

function SurfaceDemo(): ReactNode {
  const styles = useStyles();
  return <Surface style={styles.demo} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Surface'),
  render: () => <SurfaceDemo />,
};
