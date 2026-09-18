import type { DisplayText } from '@huma/contracts';
import { FONT_FAMILIES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';

export type TextProps = Readonly<{ children: DisplayText; style?: StyleRef }>;

const useStyles = createStyles(() => ({ text: { fontFamily: FONT_FAMILIES.body.regular } }));

/** App text, in the body typeface by default; a passed style overrides it, weight by weight. */
export function Text({ children, style }: TextProps): ReactNode {
  const styles = useStyles();
  return <NativeText style={[styles.text, style]}>{children}</NativeText>;
}
