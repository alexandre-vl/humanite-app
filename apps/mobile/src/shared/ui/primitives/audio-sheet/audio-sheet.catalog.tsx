import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Text } from 'react-native';
import { AudioDock } from './audio-sheet';
export const catalog: CatalogEntry = {
  name: asDisplayText('Audio · zone du mini-lecteur'),
  render: () => (
    <AudioDock>
      <Text>{asDisplayText('La lecture vous accompagne.')}</Text>
    </AudioDock>
  ),
};
