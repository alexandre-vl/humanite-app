import type { DisplayText } from '@huma/contracts';
import type { TextTone, TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import type { TextAlign } from '../../../lib/styles';
import { textStyle, useTheme, useTypesetting } from '../../../lib/styles';

export type TextProps = Readonly<{
  children: DisplayText;
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  numberOfLines?: number;
  heading?: boolean;
}>;

/**
 * App text in a named type style. The variant fixes the face, the size and the line height it derives (the size times
 * its multiple); the tone is the theme colour it paints with, the variant's own unless a caller overrides it. Text
 * truncates to numberOfLines when given, and reads a DisplayText, never a raw string. A sentence whose parts differ —
 * a slanted word, a link — is not this: it is RichText, which takes the parts rather than one string.
 *
 * `heading` says the line opens what follows it, which is how a reader listening to the paper skips through it: a
 * screen reader offers to jump from one heading to the next, and a page with none is a page that can only be walked
 * word by word. It is not read off the variant, because the same type serves a headline and the title of a card in a
 * feed, and only one of those opens anything — the screen that lays them out is what knows which.
 */
export function Text({ children, variant = 'body', tone, align, numberOfLines, heading }: TextProps): ReactNode {
  const theme = useTheme();
  const typesetting = useTypesetting();
  return (
    <NativeText
      numberOfLines={numberOfLines}
      accessibilityRole={heading === true ? 'header' : undefined}
      style={textStyle(variant, theme, typesetting, tone, align)}
    >
      {children}
    </NativeText>
  );
}
