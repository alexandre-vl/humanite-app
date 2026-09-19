import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { LabelBar } from './label-bar';

const ITEMS = [
  { id: 'headline', label: asDisplayText('À la une') },
  { id: 'bookmarks', label: asDisplayText('Favoris') },
] as const;

export const catalog: CatalogEntry = {
  name: asDisplayText('LabelBar'),
  render: () => <LabelBar items={ITEMS} active="headline" onSelect={() => undefined} />,
};
