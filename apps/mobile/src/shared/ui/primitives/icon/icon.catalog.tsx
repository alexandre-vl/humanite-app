import { LIGHT_THEME, SPACING } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Icon } from './icon';

export const catalog: CatalogEntry = {
  name: catalogLabel('Icon'),
  render: () => <Icon name="bookmark" size={SPACING.xxl} tintColor={LIGHT_THEME.primary} />,
};
