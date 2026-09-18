import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Skeleton } from './skeleton';

export const catalog: CatalogEntry = {
  name: asDisplayText('Skeleton'),
  render: () => <Skeleton />,
};
