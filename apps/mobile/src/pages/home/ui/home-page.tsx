import type { ReactNode } from 'react';
import { t } from '#i18n';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

export function HomePage(): ReactNode {
  return (
    <Surface>
      <Text>{t('app.name')}</Text>
    </Surface>
  );
}
