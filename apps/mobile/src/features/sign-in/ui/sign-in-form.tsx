import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';
import { TextField } from '#primitives/text-field';
import { Button } from '#components/button';
import { useReaderSession } from '../model/session';

export type SignInFormProps = Readonly<{
  /** What the screen does once the connection is open — go back to where the reader pressed, and nothing here. */
  onOpened: () => void;
}>;

const useStyles = createStyles((theme) => ({
  form: { gap: SPACING.xl },
  field: { gap: SPACING.xs },
  // Underlined and not boxed, as the paper's only other field is drawn: the line is the paper's own colour, so a
  // reader's eye finds where to type without a frame around it.
  line: {
    height: SPACING.xxl,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
  refusal: { gap: SPACING.xs },
}));

/**
 * What a subscriber signs in with: their identifier, their password, and one button.
 *
 * Neither field is held anywhere but here. A password in a store would outlive the screen that asked for it, and the
 * store is the one thing in this app written to a disk — so the two strings live as long as this component does, go
 * to the service, and go nowhere else. The phone's own keychain fills them, each field saying which of the two it
 * holds, which is the only part of signing in a reader should not have to do by hand.
 *
 * The button keeps its promise while a connection is opening: it says so, and a second press does nothing, the
 * connection being the one thing that knows whether one is already under way. Nothing is greyed out — a control that
 * looks disabled has to say why, and the label saying a connection is under way already does.
 *
 * Where a subscription is taken is named and not linked, as it is on a withheld article: the App Store's rule
 * 3.1.1(a) and Google Play's payments policy leave a reader's app no way to send anyone to a purchase. Signing in is
 * not a purchase, which is why this screen exists at all.
 */
export function SignInForm({ onOpened }: SignInFormProps): ReactNode {
  const styles = useStyles();
  const { connection, refusal, signIn } = useReaderSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const opening = connection === 'opening';
  const submit = (): void => {
    if (opening || login === '' || password === '') {
      return;
    }
    void signIn(login, password).then((opened) => {
      if (opened) {
        onOpened();
      }
    });
  };
  return (
    <Box style={styles.form}>
      {/* No heading here: the screen holding this form already carries the same words in its bar, and a page that
          says its own name twice reads it out twice to anyone listening to it. */}
      <Text variant="prose">{t('signIn.message')}</Text>
      <Box style={styles.field}>
        <Text variant="label">{t('signIn.login')}</Text>
        <TextField
          value={login}
          onChange={setLogin}
          placeholder={t('signIn.login.placeholder')}
          style={styles.line}
          fills="login"
          keyboard="email"
          onSubmit={submit}
        />
      </Box>
      <Box style={styles.field}>
        <Text variant="label">{t('signIn.password')}</Text>
        <TextField
          value={password}
          onChange={setPassword}
          placeholder={t('signIn.password.placeholder')}
          style={styles.line}
          fills="password"
          secret
          onSubmit={submit}
        />
      </Box>
      <Button label={opening ? t('signIn.opening') : t('signIn.submit')} onPress={submit} />
      {refusal === null ? null : (
        <Box style={styles.refusal}>
          <Text variant="body">{t(refusal === 'refused' ? 'signIn.refused' : 'signIn.unavailable')}</Text>
        </Box>
      )}
      <Text variant="caption">{t('signIn.where')}</Text>
    </Box>
  );
}
