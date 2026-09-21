import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { DECORATIVE } from '../../../lib/announce';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { useTheme } from '../../../lib/styles';
import { Icon } from './icon';

function IconDemo(): ReactNode {
  const theme = useTheme();
  return <Icon name="bookmark" announces={DECORATIVE} size={SPACING.xxl} tintColor={theme.primary} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Icon'),
  render: () => <IconDemo />,
};
