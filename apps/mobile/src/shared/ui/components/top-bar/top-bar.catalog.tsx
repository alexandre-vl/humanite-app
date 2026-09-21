import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { TopBar } from './top-bar';

export const catalog: CatalogEntry = {
  name: asDisplayText('TopBar'),
  render: () => (
    <TopBar
      title={asDisplayText('Rubrique')}
      onBack={() => {
        // A catalogue entry is drawn, not pressed: the bar reports a press and the gallery has nowhere to go back to.
      }}
    />
  ),
};
