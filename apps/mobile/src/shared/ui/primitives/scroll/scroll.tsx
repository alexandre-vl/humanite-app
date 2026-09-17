import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { StyleRef } from '../../../lib/styles';

export type ScrollProps = Readonly<{ children?: ReactNode; style?: StyleRef; contentStyle?: StyleRef }>;

/** A vertically scrolling region; its own frame takes `style`, the content it scrolls takes `contentStyle`. */
export function Scroll({ children, style, contentStyle }: ScrollProps): ReactNode {
  return (
    <ScrollView style={style} contentContainerStyle={contentStyle}>
      {children}
    </ScrollView>
  );
}
