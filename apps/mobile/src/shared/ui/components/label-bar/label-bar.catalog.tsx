import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { LabelBar } from './label-bar';

/** The front and the sections after it, which is what the band names on the front page. */
const ITEMS = [
  { id: 'front', label: asDisplayText('À la une') },
  { id: 'politique', label: asDisplayText('Politique') },
  { id: 'monde', label: asDisplayText('Monde') },
] as const;

export const catalog: CatalogEntry = {
  name: asDisplayText('LabelBar'),
  render: () => <LabelBar items={ITEMS} active="front" onSelect={() => undefined} />,
};
