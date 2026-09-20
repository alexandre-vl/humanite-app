import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Switch } from './switch';

export const catalog: CatalogEntry = {
  name: asDisplayText('Switch'),
  render: () => <Switch value onChange={() => undefined} label={asDisplayText('Réglage')} />,
};
