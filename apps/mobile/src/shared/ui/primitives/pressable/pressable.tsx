import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Pressable as NativePressable } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type PressableProps = Readonly<{
  children?: ReactNode;
  style?: StyleRef;
  onPress?: (() => void) | undefined;
  label?: DisplayText | undefined;
  role?: 'radio' | undefined;
  selected?: boolean | undefined;
}>;

/**
 * A touch target laid out by a StyleRef; the one primitive that answers a press.
 *
 * A target whose children say what it does needs no label — a screen reader reads them. One drawn as a symbol says
 * nothing out loud, and the label is the only thing it can be announced by, which is why it is a DisplayText like any
 * other text the app puts in front of a reader.
 *
 * A target that is one option among several says so too: the role names what it is and `selected` whether it is the
 * one in force, so a row of choices the app draws itself is announced the way the platform's own would be. The role is
 * a closed set rather than the platform's whole list — it holds the one shape the app has, and grows when a second
 * appears.
 */
export function Pressable({ children, style, onPress, label, role, selected }: PressableProps): ReactNode {
  return (
    <NativePressable
      style={style}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      {children}
    </NativePressable>
  );
}
