import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Skeleton } from './skeleton';

export const catalog: CatalogEntry = {
  name: catalogLabel('Skeleton'),
  render: () => <Skeleton />,
};
