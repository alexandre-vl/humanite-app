import type { DisplayText } from '@huma/contracts';
import type { TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Keyboard, TextInput as NativeTextInput } from 'react-native';
import type { TextInputProps as NativeTextFieldProps } from 'react-native';
import type { StyleRef } from '../../../lib/styles';
import { inputStyle, useTheme, useTypesetting } from '../../../lib/styles';

/** What the phone's own keychain may put in a field, named as the app names it rather than as each platform does. */
const FILLS = {
  login: { autoComplete: 'username', textContentType: 'username' },
  password: { autoComplete: 'current-password', textContentType: 'password' },
} as const satisfies Readonly<
  Record<
    string,
    Readonly<{
      autoComplete: NativeTextFieldProps['autoComplete'];
      textContentType: NativeTextFieldProps['textContentType'];
    }>
  >
>;

/** What a field says it holds, so the keychain offers the right thing and nothing else. */
type Fill = keyof typeof FILLS;

export type TextFieldProps = Readonly<{
  value: string;
  onChange: (text: string) => void;
  placeholder: DisplayText;
  variant?: TextVariant;
  style?: StyleRef;
  /** What the keychain may fill here; nothing offered when it is left out. */
  fills?: Fill;
  /** Whether what is typed stays hidden, which a password is and a name is not. */
  secret?: boolean;
  /** Whether the keyboard is the one an address is typed on. */
  keyboard?: 'email';
  /** What the key that closes the keyboard does, and the word it carries; no key at all when it is left out. */
  onSubmit?: () => void;
}>;

/**
 * One line of text a reader types. The box is a StyleRef like any other view's; the letters are the variant's, through
 * the one constructor that turns a variant into type. What a reader types is a plain string and stays one: a
 * DisplayText is text the app answers for, and this is text the app was handed.
 *
 * It corrects nothing and capitalises nothing. A word the keyboard has helpfully corrected is a word the paper may
 * not hold, and an identifier the keyboard has helpfully capitalised is one the service refuses. The caret and the
 * selection take the paper's own colour, and the placeholder the muted one, so neither is a colour written here.
 *
 * What the keychain may fill is said rather than guessed: a field that names nothing is offered nothing, which is
 * every field of this app but the two a subscriber signs in with. Those two say which they are, so the phone offers
 * the saved pair instead of the last thing typed anywhere — the one part of signing in that a reader should not have
 * to do by hand, on a password they never chose to memorise.
 */
export function TextField({
  value,
  onChange,
  placeholder,
  variant = 'body',
  style,
  fills,
  secret = false,
  keyboard,
  onSubmit,
}: TextFieldProps): ReactNode {
  const theme = useTheme();
  const typesetting = useTypesetting();
  return (
    <NativeTextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      cursorColor={theme.primary}
      selectionColor={theme.primary}
      selectionHandleColor={theme.primary}
      autoCorrect={false}
      autoCapitalize="none"
      secureTextEntry={secret}
      autoComplete={fills === undefined ? 'off' : FILLS[fills].autoComplete}
      textContentType={fills === undefined ? 'none' : FILLS[fills].textContentType}
      keyboardType={keyboard === 'email' ? 'email-address' : 'default'}
      returnKeyType={onSubmit === undefined ? undefined : 'go'}
      onSubmitEditing={onSubmit}
      style={[style, inputStyle(variant, theme, typesetting)]}
    />
  );
}

/**
 * Puts the keyboard away, from whichever field holds it.
 *
 * A screen that opens something from under a field calls it on the way: an article opened from a search answer is
 * read, and a keyboard left up over it would hide half of what was opened. It lives beside the field because the
 * keyboard is the native layer's, and a screen may not reach that layer itself.
 */
export const dismissKeyboard = (): void => {
  Keyboard.dismiss();
};
