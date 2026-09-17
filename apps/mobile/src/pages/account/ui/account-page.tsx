import type { ReactNode } from 'react';
import { t } from '#i18n';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

export function AccountPage(): ReactNode {
  return (
    <Surface>
      <Text>{t('nav.account')}</Text>
    </Surface>
  );
}
