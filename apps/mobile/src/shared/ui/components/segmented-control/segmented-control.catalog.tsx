import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { SegmentedControl } from './segmented-control';

const ITEMS = [
  { id: 'small', label: asDisplayText('Petit') },
  { id: 'normal', label: asDisplayText('Normal') },
  { id: 'large', label: asDisplayText('Grand') },
] as const;

export const catalog: CatalogEntry = {
  name: asDisplayText('SegmentedControl'),
  render: () => <SegmentedControl items={ITEMS} active="normal" onSelect={() => undefined} />,
};
