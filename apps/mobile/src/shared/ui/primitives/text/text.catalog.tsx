import { TEXT_VARIANTS } from '@huma/design-tokens';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { Text } from './text';

export const catalog: CatalogEntry = {
  name: asDisplayText('Text'),
  render: () => (
    <>
      {TEXT_VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {asDisplayText(variant)}
        </Text>
      ))}
    </>
  ),
};
