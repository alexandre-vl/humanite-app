import { TEXT_VARIANTS } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { Text } from './text';

export const catalog: CatalogEntry = {
  name: catalogLabel('Text'),
  render: () => (
    <>
      {TEXT_VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {catalogLabel(variant)}
        </Text>
      ))}
    </>
  ),
};
