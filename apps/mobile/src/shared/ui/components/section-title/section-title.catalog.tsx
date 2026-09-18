import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { SectionTitle } from './section-title';

export const catalog: CatalogEntry = {
  name: asDisplayText('SectionTitle'),
  render: () => <SectionTitle title={asDisplayText('À la une')} />,
};
