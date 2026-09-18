import type { DisplayText } from '@huma/contracts';
import type { TextTone, TextVariant } from '@huma/design-tokens';
import { TYPOGRAPHY } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import { useTheme } from '../../../lib/styles';

export type TextProps = Readonly<{
  children: DisplayText;
  variant?: TextVariant;
  tone?: TextTone;
  numberOfLines?: number;
}>;

/**
 * App text in a named type style. The variant fixes the face, the size and the line height it derives (the size times
 * its multiple); the tone is the theme colour it paints with, the variant's own unless a caller overrides it. Text
 * truncates to numberOfLines when given, and reads a DisplayText, never a raw string.
 */
export function Text({ children, variant = 'body', tone, numberOfLines }: TextProps): ReactNode {
  const theme = useTheme();
  const role = TYPOGRAPHY[variant];
  const style = {
    fontFamily: role.family,
    fontSize: role.size,
    lineHeight: role.size * role.leading,
    color: theme[tone ?? role.tone],
  };
  return (
    <NativeText numberOfLines={numberOfLines} style={style}>
      {children}
    </NativeText>
  );
}
