import { SymbolView } from 'expo-symbols';
import { LIGHT_THEME, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { ICONS } from './icon-registry';
import type { IconProps } from './icon-registry';

/** A platform-native symbol named by a semantic key: SF Symbols on iOS, Material Symbols on Android, from one registry. */
export function Icon({ name, size = SPACING.xl, tintColor = LIGHT_THEME.textPrimary, style }: IconProps): ReactNode {
  const symbol = ICONS[name];
  return (
    <SymbolView name={{ ios: symbol.ios, android: symbol.android }} size={size} tintColor={tintColor} style={style} />
  );
}
