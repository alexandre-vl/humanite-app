import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Button } from './button';

export const catalog: CatalogEntry = {
  name: catalogLabel('Button'),
  render: () => <Button label={catalogLabel('Bouton')} />,
};
