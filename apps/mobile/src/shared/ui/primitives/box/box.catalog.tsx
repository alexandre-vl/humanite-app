import { LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { createStyles } from '../../../lib/styles';
import { Box } from './box';

const styles = createStyles({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: LIGHT_THEME.primary },
});

export const catalog: CatalogEntry = {
  name: catalogLabel('Box'),
  render: () => <Box style={styles.demo} />,
};
