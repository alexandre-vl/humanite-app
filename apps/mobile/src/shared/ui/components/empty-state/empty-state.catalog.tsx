import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { EmptyState } from './empty-state';

export const catalog: CatalogEntry = {
  name: catalogLabel('EmptyState'),
  render: () => (
    <EmptyState title={catalogLabel('Rien à afficher')} message={catalogLabel('Aucun contenu pour le moment')} />
  ),
};
