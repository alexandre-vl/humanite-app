import type { DisplayText } from '@huma/contracts';
import type { TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { TextInput as NativeTextInput } from 'react-native';
import type { StyleRef } from '../../../lib/styles';
import { inputStyle, useTheme, useTypesetting } from '../../../lib/styles';

export type TextFieldProps = Readonly<{
  value: string;
  onChange: (text: string) => void;
  placeholder: DisplayText;
  variant?: TextVariant;
  style?: StyleRef;
}>;

/**
 * One line of text a reader types. The box is a StyleRef like any other view's; the letters are the variant's, through
 * the one constructor that turns a variant into type. What a reader types is a plain string and stays one: a
 * DisplayText is text the app answers for, and this is text the app was handed.
 *
 * It corrects nothing and capitalises nothing. The app's only field searches the paper, and a word the keyboard has
 * helpfully corrected is a word the paper may not hold; a field that wanted either would arrive with the screen that
 * needs it. The caret and the selection take the paper's own colour, and the placeholder the muted one, so neither is
 * a colour written here.
 */
export function TextField({ value, onChange, placeholder, variant = 'body', style }: TextFieldProps): ReactNode {
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
      style={[style, inputStyle(variant, theme, typesetting)]}
    />
  );
}
