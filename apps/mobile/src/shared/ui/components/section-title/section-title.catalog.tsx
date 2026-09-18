import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { SectionTitle } from './section-title';

export const catalog: CatalogEntry = {
  name: catalogLabel('SectionTitle'),
  render: () => <SectionTitle title={catalogLabel('À la une')} />,
};
