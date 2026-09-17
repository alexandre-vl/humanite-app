import { FONT_FAMILIES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { useStartup } from '#lib/startup';
import { createStyles } from '#lib/styles';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const styles = createStyles({ masthead: { fontFamily: FONT_FAMILIES.display } });

export function HomePage(): ReactNode {
  const { signalFirstLayout } = useStartup();
  return (
    <Surface onLayout={signalFirstLayout}>
      <Text style={styles.masthead}>{t('app.name')}</Text>
    </Surface>
  );
}
