import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Chip } from './chip';

export const catalog: CatalogEntry = {
  name: catalogLabel('Chip'),
  render: () => <Chip label={catalogLabel('Politique')} />,
};
