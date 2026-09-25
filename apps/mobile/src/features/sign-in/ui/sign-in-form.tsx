import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { Refusal } from '#api';
import { Button } from '#components/button';
import { t } from '#i18n';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Text } from '#primitives/text';
import type { FieldHandle } from '#primitives/text-field';
import { TextField } from '#primitives/text-field';
import { DECORATIVE } from '#lib/announce';
import { useReaderSession } from '../model/session';

export type SignInFormProps = Readonly<{
  /** What the screen does once the connection is open — go back to where the reader pressed, and nothing here. */
  onOpened: () => void;
}>;

/**
 * What stands between the fields and the button: what the service said of an attempt, or which field a press found
 * empty — the same place, because it is the same thought: what you typed, what is wrong with it, what to do about it.
 */
type Said = Refusal | 'missing.login' | 'missing.password' | 'missing.both';

/**
 * Which of the two fields is still empty, if one is. An identifier of spaces is empty: it is the one thing a reader
 * pasting an address from a message brings with it, and it is never part of the address.
 */
const missingOf = (login: string, password: string): Said | null => {
  if (login.trim() === '') {
    return password === '' ? 'missing.both' : 'missing.login';
  }
  return password === '' ? 'missing.password' : null;
};

const useStyles = createStyles((theme) => ({
  form: { gap: SPACING.xl },
  // The name stands on its line with no gap between them, so a press anywhere from the name down to the rule lands on
  // the field.
  name: { paddingBottom: SPACING.xs },
  // Underlined and not boxed, as the paper's only other field is drawn: the line is the paper's own colour, so a
  // reader's eye finds where to type without a frame around it.
  //
  // A floor and not a height, as on the search line. The field is as tall as what is typed in it, which is a thing the
  // reader sets: a box measured for one step of type — thirty-two points — cut the tops off the letters at the first.
  // And never less than a finger's grid step: grown only by its padding, the field was 28,3 points tall, and that was
  // the whole of what a thumb could land on (iPhone simulator, 25/09/2026).
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: SPACING.xxxl,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
  // The field is the whole line, and the room that keeps its letters off the rule is its own, inside the target.
  input: { flex: 1, alignSelf: 'stretch', paddingVertical: SPACING.xs },
  // The eye takes a finger's width at the end of the line, and the line's whole height: held to a square of its own, it
  // stood the password's line two points taller than the identifier's, the rule under it counted in.
  eye: {
    width: SPACING.xxxl,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * What the paper does with a passage a reader must not skip: a bar down its left margin.
   *
   * Not a rule above it, which is the wall's device: the two fields over it already draw rules, and a third across
   * the column would read as a third field. Not the ink either — the journal's red is proven as text at twenty-four
   * points and at no step below (ADR-0026 R3, `PRINTINGS.mark`), so a refusal set in it would be a refusal a reader
   * with tired eyes cannot read. The red is in the bar, where nothing has to be read out of it, and the words stay
   * in the ink of the page.
   */
  refusal: {
    gap: SPACING.xs,
    paddingLeft: SPACING.md,
    borderLeftWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
}));

/**
 * What a subscriber signs in with: their identifier, their password, and one button.
 *
 * Nothing a reader types is held anywhere but here, and neither is what the service said of it. A password in a store
 * would outlive the screen that asked for it, and the store is the one thing in this app written to a disk; a refusal
 * in a store would outlive the attempt that earned it, and greet the next reader to open this screen with an
 * accusation about a password they had not typed. Both live as long as this component does, which is exactly as long
 * as they mean anything.
 *
 * The refusal goes at the first keystroke, on either field. A reader correcting a typo has already understood, and
 * the line telling them about it is from that moment in the way.
 *
 * A press with a field left empty is answered there too, naming the field. It used to be answered by nothing at all:
 * the one button of the screen, pressed, did not move, which is the thing the handler of a failed attempt takes care never to do.
 *
 * It stands between the last field and the button, which is where a reader who has just pressed is looking, and the
 * order on the page is then the order of the thought: what you typed, what went wrong with it, what to do about it.
 * It was under the button, where it read as a third paragraph of the page and ran straight into the line saying
 * where a subscription is bought — telling a subscriber who had mistyped their password to go and buy one.
 *
 * The phone's own keychain fills the pair, each field saying which of the two it holds, which is the only part of
 * signing in a reader should not have to do by hand. The button keeps its promise while a connection is opening: it
 * says so, and a second press does nothing. Nothing is greyed out — a control that looks disabled has to say why, and
 * the label already does.
 *
 * Where a subscription is taken is named and not linked, as it is on a withheld article: the App Store's rule
 * 3.1.1(a) and Google Play's payments policy leave a reader's app no way to send anyone to a purchase. Signing in is
 * not a purchase, which is why this screen exists at all.
 */
export function SignInForm({ onOpened }: SignInFormProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const { connection, signIn } = useReaderSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [refusal, setRefusal] = useState<Said | null>(null);
  const [shown, setShown] = useState(false);
  const loginField = useRef<FieldHandle>(null);
  const passwordField = useRef<FieldHandle>(null);
  const opening = connection === 'opening';
  const submit = (): void => {
    if (opening) {
      return;
    }
    const missing = missingOf(login, password);
    if (missing !== null) {
      setRefusal(missing);
      // The caret goes where the typing is wanted: the reader is told what is missing and is already in it.
      (missing === 'missing.password' ? passwordField : loginField).current?.focus();
      return;
    }
    void (async (): Promise<void> => {
      const opened = await signIn(login.trim(), password);
      if (opened.kind === 'opened') {
        onOpened();
      } else if (opened.kind === 'refused') {
        // The pair stays as it was typed, the password with it: the eye shows what was refused, and one wrong letter is
        // mended rather than the whole typed again blind. Nor does the caret go back into a field. The keyboard it
        // raises covered the whole refusal at a large text size (iPhone simulator, 25/09/2026), and the reader is owed
        // the reason before the next try.
        setRefusal(opened.why);
      }
    })().catch(() => {
      // Nothing under the service is expected to fail, and a screen that quietly did nothing on a press would be the
      // worst of both: the reader is told what they are told when the journal does not answer, which is what it is.
      setRefusal('unavailable');
    });
  };
  return (
    <Box style={styles.form}>
      {/* No heading here: the screen holding this form already carries the same words in its bar, and a page that
          says its own name twice reads it out twice to anyone listening to it. */}
      <Text variant="prose">{t('signIn.message')}</Text>
      <Box>
        {/* Heard on the field itself, where a reader listening is when they type, and not on a line of its own: the
            name answers a finger and nobody listening, the field being a stop of its own. */}
        <Pressable
          style={styles.name}
          announces={DECORATIVE}
          onPress={() => {
            loginField.current?.focus();
          }}
        >
          <Text variant="label" announces={DECORATIVE}>
            {t('signIn.login')}
          </Text>
        </Pressable>
        <Box style={styles.line}>
          <TextField
            ref={loginField}
            value={login}
            onChange={(text) => {
              setRefusal(null);
              setLogin(text);
            }}
            label={t('signIn.login')}
            placeholder={t('signIn.login.placeholder')}
            style={styles.input}
            fills="login"
            keyboard="email"
            onNext={() => {
              passwordField.current?.focus();
            }}
          />
        </Box>
      </Box>
      <Box>
        <Pressable
          style={styles.name}
          announces={DECORATIVE}
          onPress={() => {
            passwordField.current?.focus();
          }}
        >
          <Text variant="label" announces={DECORATIVE}>
            {t('signIn.password')}
          </Text>
        </Pressable>
        <Box style={styles.line}>
          <TextField
            ref={passwordField}
            value={password}
            onChange={(text) => {
              setRefusal(null);
              setPassword(text);
            }}
            label={t('signIn.password')}
            placeholder={t('signIn.password.placeholder')}
            style={styles.input}
            fills="password"
            secret={!shown}
            onSubmit={submit}
          />
          <Pressable
            style={styles.eye}
            label={t(shown ? 'signIn.password.hide' : 'signIn.password.show')}
            role="button"
            onPress={() => {
              setShown(!shown);
            }}
          >
            <Icon name={shown ? 'conceal' : 'reveal'} announces={DECORATIVE} tintColor={theme.textMuted} />
          </Pressable>
        </Box>
      </Box>
      {refusal === null ? null : (
        <Box style={styles.refusal}>
          <Text variant="label" alert>
            {t(`signIn.${refusal}.title`)}
          </Text>
          <Text variant="body">{t(`signIn.${refusal}.message`)}</Text>
        </Box>
      )}
      <Button label={opening ? t('signIn.opening') : t('signIn.submit')} onPress={submit} />
      <Text variant="caption">{t('signIn.where')}</Text>
    </Box>
  );
}
