import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { EmptyState } from './empty-state';

export const catalog: CatalogEntry = {
  name: asDisplayText('EmptyState'),
  render: () => (
    <EmptyState title={asDisplayText('Rien à afficher')} message={asDisplayText('Aucun contenu pour le moment')} />
  ),
};
