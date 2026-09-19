import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Pressable as NativePressable } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type PressableProps = Readonly<{
  children?: ReactNode;
  style?: StyleRef;
  onPress?: (() => void) | undefined;
  label?: DisplayText | undefined;
}>;

/**
 * A touch target laid out by a StyleRef; the one primitive that answers a press.
 *
 * A target whose children say what it does needs no label — a screen reader reads them. One drawn as a symbol says
 * nothing out loud, and the label is the only thing it can be announced by, which is why it is a DisplayText like any
 * other text the app puts in front of a reader.
 */
export function Pressable({ children, style, onPress, label }: PressableProps): ReactNode {
  return (
    <NativePressable style={style} onPress={onPress} accessibilityLabel={label}>
      {children}
    </NativePressable>
  );
}
