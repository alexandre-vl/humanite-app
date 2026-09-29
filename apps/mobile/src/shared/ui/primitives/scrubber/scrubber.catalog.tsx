import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Scrubber } from './scrubber';
export const catalog: CatalogEntry = {
  name: asDisplayText('Audio · progression'),
  render: () => <Scrubber value={0.4} label={asDisplayText('Progression')} onChange={() => undefined} />,
};
