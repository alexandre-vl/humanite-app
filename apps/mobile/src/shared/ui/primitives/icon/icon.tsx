import { SymbolView } from 'expo-symbols';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { announcedAs } from '../../../lib/announce';
import { useTheme } from '../../../lib/styles';
import { ICONS } from './icon-registry';
import type { IconProps } from './icon-registry';
import { DRAWN_AS_TEXT, symbolSize } from './symbol-size';

/**
 * A platform-native symbol named by a semantic key: SF Symbols on iOS, Material Symbols on Android, from one registry.
 *
 * On Android the symbol is not a picture but a letter: the library sets a font and draws the mark as text at the size
 * it was handed, inside a box of that same size. A letter follows the reader's own size, and a box does not — so at
 * the largest step the phone offers, the mark was drawn at twice its box and cut down to a corner. Measured on an
 * A065: whole at 1,00 and at 1,30, an angle at 2,00. A mark is not a word — it is the shape of a thing, and it is
 * already as large as the paper wants it — so the size handed over is divided by the reader's step, which lands the
 * glyph back where it was asked for, and the box is given here at the size the caller named. iOS draws a real symbol
 * from a size in points and has no step to undo.
 */
export function Icon({ name, announces, size = SPACING.xl, tintColor, style }: IconProps): ReactNode {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const symbol = ICONS[name];
  const box = { width: size, height: size };
  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android }}
      size={symbolSize(size, fontScale, DRAWN_AS_TEXT)}
      tintColor={tintColor ?? theme.textPrimary}
      style={style === undefined ? box : [box, style]}
      {...announcedAs(announces)}
    />
  );
}
