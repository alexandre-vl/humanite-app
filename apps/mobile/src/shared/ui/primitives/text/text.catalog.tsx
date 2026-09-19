import { TEXT_VARIANTS } from '@huma/design-tokens';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import type { TextRun } from './rich-text';
import { RichText } from './rich-text';
import { Text } from './text';

/** A sentence that exercises every way a run may differ: plain words, a slanted one, a bold one, and a link. */
const RUNS: readonly TextRun[] = [
  { text: asDisplayText('Une phrase dont ') },
  { text: asDisplayText('un mot penche'), face: 'italic' },
  { text: asDisplayText(', un autre ') },
  { text: asDisplayText('pèse'), face: 'strong' },
  { text: asDisplayText(', et un dernier ') },
  {
    text: asDisplayText('répond à la pression'),
    onPress: () => {
      /* le catalogue montre la forme d’un lien, il ne mène nulle part */
    },
  },
  { text: asDisplayText('.') },
];

export const catalog: CatalogEntry = {
  name: asDisplayText('Text'),
  render: () => (
    <>
      {TEXT_VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {asDisplayText(variant)}
        </Text>
      ))}
      <RichText runs={RUNS} />
    </>
  ),
};
