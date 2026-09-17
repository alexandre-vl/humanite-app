import { LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { createStyles } from '../../../lib/styles';
import { Surface } from './surface';

const styles = createStyles({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: LIGHT_THEME.card },
});

export const catalog: CatalogEntry = {
  name: catalogLabel('Surface'),
  render: () => <Surface style={styles.demo} />,
};
