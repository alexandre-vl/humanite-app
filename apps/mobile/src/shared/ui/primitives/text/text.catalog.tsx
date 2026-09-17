import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Text } from './text';

export const catalog: CatalogEntry = {
  name: catalogLabel('Text'),
  render: () => <Text>{catalogLabel('Un texte affiché')}</Text>,
};
