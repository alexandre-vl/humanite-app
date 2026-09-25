import type { DisplayText } from '@huma/contracts';
import type { TextVariant } from '@huma/design-tokens';
import type { ReactNode, Ref } from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { Keyboard, Platform, TextInput as NativeTextInput } from 'react-native';
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

/** What a screen may do to a field from outside it: put the caret in it. */
export type FieldHandle = Readonly<{ focus: () => void }>;

/** Whether the platform empties a secret field at the first key after its letters are hidden again: iOS does. */
const CLEARS_ON_HIDING = Platform.OS === 'ios';

/**
 * What a reader meant by the first key pressed in a secret field hidden again, given what the field held when it was
 * hidden. iOS empties a secure field at that key — « abcd », hidden, then « e », left « e » on the iPhone simulator on
 * 25/09/2026 — and the key was meant for the end of what was there. A field that kept its letters is taken as it is.
 */
const repairedAfterHiding = (held: string, typed: string): string =>
  typed.startsWith(held) || (held.startsWith(typed) && typed.length === held.length - 1) ? typed : held + typed;

export type TextFieldProps = Readonly<{
  value: string;
  onChange: (text: string) => void;
  /**
   * The field's name, as a reader listening to the screen hears it on the field, whatever has been typed there.
   *
   * The placeholder is no name. It is gone at the first letter, and then the field said only what it held: on the
   * iPhone simulator on 25/09/2026, both fields of the sign-in screen and the search line were read as a value and
   * « champ de texte », with nothing to say which was which.
   */
  label: DisplayText;
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
  /**
   * What the key does on a field a reader leaves for another: it carries the word for the next one, and the keyboard
   * stays up for it. It is the key of every field of a form but the last, whose key sends the form.
   */
  onNext?: () => void;
  /** Where a screen puts the caret in the field from: a field's name pressed, a field found empty on sending. */
  ref?: Ref<FieldHandle>;
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
  label,
  placeholder,
  variant = 'body',
  style,
  fills,
  secret = false,
  keyboard,
  onSubmit,
  onNext,
  ref,
}: TextFieldProps): ReactNode {
  const theme = useTheme();
  const typesetting = useTypesetting();
  const input = useRef<NativeTextInput>(null);
  // What the field held when its letters were last hidden, until the next key says whether iOS kept them — and
  // whether the empty report hiding sends has come in yet.
  const hidden = useRef<Readonly<{ held: string; echoed: boolean }> | null>(null);
  const held = useRef(value);
  useEffect(() => {
    held.current = value;
    // A field set from outside since — a refused password emptied — no longer holds what was hidden, and the next key
    // is only a key: mended, it brought the refused password back.
    if (hidden.current !== null && hidden.current.held !== value) {
      hidden.current = null;
    }
  });
  useEffect(() => {
    hidden.current = secret && CLEARS_ON_HIDING && held.current !== '' ? { held: held.current, echoed: false } : null;
  }, [secret]);
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        input.current?.focus();
      },
    }),
    [],
  );
  return (
    <NativeTextInput
      ref={input}
      value={value}
      onChangeText={(typed) => {
        const before = hidden.current;
        if (before === null || typed === before.held) {
          onChange(typed);
          return;
        }
        // Hiding the letters reports the field emptied once, and says nothing of the text it puts back (measured,
        // with every change logged): that report is not a key, and the field keeps what it held. An empty field after
        // it is the key that deletes, which iOS turned into emptying the field.
        if (typed === '' && !before.echoed) {
          hidden.current = { held: before.held, echoed: true };
          onChange(before.held);
          return;
        }
        hidden.current = null;
        onChange(typed === '' ? before.held.slice(0, -1) : repairedAfterHiding(before.held, typed));
      }}
      accessibilityLabel={label}
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
      returnKeyType={onNext === undefined ? (onSubmit === undefined ? undefined : 'go') : 'next'}
      // A field left for the next keeps the keyboard up for it: closed and opened again between two fields, it would
      // slide down and back up under the reader's thumbs.
      submitBehavior={onNext === undefined ? undefined : 'submit'}
      onSubmitEditing={onNext ?? onSubmit}
      // The phone's text size is in the style already, as it is in a Text's: scaled again, typing would print larger
      // than the words around the field.
      allowFontScaling={false}
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
