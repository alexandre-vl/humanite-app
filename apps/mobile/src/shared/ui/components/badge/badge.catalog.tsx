import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Badge } from './badge';

export const catalog: CatalogEntry = {
  name: asDisplayText('Badge'),
  render: () => <Badge label={asDisplayText('Premium')} />,
};
