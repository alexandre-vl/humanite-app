import type { ReactNode } from 'react';
import { Pressable as NativePressable } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type PressableProps = Readonly<{ children?: ReactNode; style?: StyleRef; onPress?: (() => void) | undefined }>;

/** A touch target laid out by a StyleRef; the one primitive that answers a press. */
export function Pressable({ children, style, onPress }: PressableProps): ReactNode {
  return (
    <NativePressable style={style} onPress={onPress}>
      {children}
    </NativePressable>
  );
}
