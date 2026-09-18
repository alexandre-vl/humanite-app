import { SPACING } from '@huma/design-tokens';
import type { ErrorBoundaryProps } from 'expo-router';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';

const useStyles = createStyles(() => ({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
}));

/**
 * What a route shows when its render throws. Expo Router hands the boundary a retry that clears the error and renders
 * the screen again, which is the only way out of here without leaving the app.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps): ReactNode {
  const styles = useStyles();
  return (
    <Surface>
      <Box style={styles.frame}>
        <EmptyState title={t('error.title')} message={t('error.message')} />
        <Button
          label={t('action.retry')}
          onPress={() => {
            void retry();
          }}
        />
      </Box>
    </Surface>
  );
}
