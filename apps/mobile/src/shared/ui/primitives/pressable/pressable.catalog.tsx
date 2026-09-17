import { LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { createStyles } from '../../../lib/styles';
import { Pressable } from './pressable';

const styles = createStyles({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: LIGHT_THEME.premium },
});

export const catalog: CatalogEntry = {
  name: catalogLabel('Pressable'),
  render: () => <Pressable style={styles.demo} />,
};
