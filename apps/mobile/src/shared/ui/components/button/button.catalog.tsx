import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Button } from './button';

export const catalog: CatalogEntry = {
  name: asDisplayText('Button'),
  render: () => <Button label={asDisplayText('Bouton')} />,
};
