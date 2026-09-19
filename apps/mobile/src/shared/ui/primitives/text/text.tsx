import type { DisplayText } from '@huma/contracts';
import type { TextTone, TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import type { TextAlign } from '../../../lib/styles';
import { textStyle, useTheme } from '../../../lib/styles';

export type TextProps = Readonly<{
  children: DisplayText;
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  numberOfLines?: number;
}>;

/**
 * App text in a named type style. The variant fixes the face, the size and the line height it derives (the size times
 * its multiple); the tone is the theme colour it paints with, the variant's own unless a caller overrides it. Text
 * truncates to numberOfLines when given, and reads a DisplayText, never a raw string. A sentence whose parts differ —
 * a slanted word, a link — is not this: it is RichText, which takes the parts rather than one string.
 */
export function Text({ children, variant = 'body', tone, align, numberOfLines }: TextProps): ReactNode {
  const theme = useTheme();
  return (
    <NativeText numberOfLines={numberOfLines} style={textStyle(variant, theme, tone, align)}>
      {children}
    </NativeText>
  );
}
