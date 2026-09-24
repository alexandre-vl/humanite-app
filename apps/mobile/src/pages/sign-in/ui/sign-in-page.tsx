import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SignInForm } from '#features/sign-in';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { TopBar } from '#components/top-bar';

const useStyles = createStyles(() => ({
  page: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
}));

/**
 * Where a subscriber signs in: one screen, pushed from the account, holding nothing but the form.
 *
 * It goes back the moment the connection opens, rather than showing a screen saying so. The reader pressed the row from somewhere, and what they wanted was that somewhere with the wall gone — the account now naming
 * them, or the article they were reading opened. A screen congratulating them would be one more press between a
 * reader and the thing they pay for.
 */
export function SignInPage(): ReactNode {
  const styles = useStyles();
  return (
    <Surface>
      <TopBar
        title={t('signIn.screen')}
        onBack={() => {
          router.back();
        }}
      />
      <Scroll axis="vertical" contentStyle={styles.page}>
        <SignInForm
          onOpened={() => {
            router.back();
          }}
        />
      </Scroll>
    </Surface>
  );
}
