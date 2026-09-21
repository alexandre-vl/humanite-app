import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Text } from '../../primitives/text';
import { Paper } from './paper';

export const catalog: CatalogEntry = {
  name: asDisplayText('Paper'),
  render: () => (
    <Paper>
      <Text variant="title">{asDisplayText('Sur le même thème')}</Text>
      <Text variant="prose">{asDisplayText('Un morceau de papier tombé sur la page, et toujours clair.')}</Text>
    </Paper>
  ),
};
