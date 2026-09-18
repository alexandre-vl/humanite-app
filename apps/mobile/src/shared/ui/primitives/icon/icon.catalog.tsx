import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { useTheme } from '../../../lib/styles';
import { Icon } from './icon';

function IconDemo(): ReactNode {
  const theme = useTheme();
  return <Icon name="bookmark" size={SPACING.xxl} tintColor={theme.primary} />;
}

export const catalog: CatalogEntry = {
  name: catalogLabel('Icon'),
  render: () => <IconDemo />,
};
