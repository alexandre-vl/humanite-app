import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Chip } from './chip';

export const catalog: CatalogEntry = {
  name: asDisplayText('Chip'),
  render: () => <Chip label={asDisplayText('Politique')} />,
};
