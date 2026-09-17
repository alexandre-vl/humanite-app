import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Badge } from './badge';

export const catalog: CatalogEntry = {
  name: catalogLabel('Badge'),
  render: () => <Badge label={catalogLabel('Premium')} />,
};
