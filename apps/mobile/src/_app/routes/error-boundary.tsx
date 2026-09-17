import type { ReactNode } from 'react';
import { t } from '#i18n';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

export function ErrorBoundary(): ReactNode {
  return (
    <Surface>
      <Text>{t('error.generic')}</Text>
    </Surface>
  );
}
