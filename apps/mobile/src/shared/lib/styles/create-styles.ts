import type { Angle, Brand, Color, Radius, Space, Theme } from '@huma/design-tokens';
import { useMemo } from 'react';
import { useTheme } from './theme';

/**
 * A style built only from design tokens: every length, radius and colour is a branded token, so a raw dimension cannot
 * reach a native view. Layout keywords stay plain, the way React Native types them, and so do the six fields that carry
 * a ratio rather than a dimension — `flex`, `flexGrow`, `flexShrink`, `aspectRatio`, `opacity`, `zIndex` — which no
 * token scale would measure. Typography is absent: a run of text names a Text variant, and `textStyle` alone turns that
 * into a face, a size, a colour and the line height it derives. The one transform a style may carry is a rotation by a
 * named angle, because the one the app has is the tilt the journal lays its paper at; anything that moves belongs to a
 * worklet inside a primitive, not to a table built once per theme.
 */
type Style = Readonly<{
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Space;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  position?: 'absolute' | 'relative';
  margin?: Space;
  marginTop?: Space;
  marginBottom?: Space;
  marginLeft?: Space;
  marginRight?: Space;
  marginHorizontal?: Space;
  marginVertical?: Space;
  padding?: Space;
  paddingTop?: Space;
  paddingBottom?: Space;
  paddingLeft?: Space;
  paddingRight?: Space;
  paddingHorizontal?: Space;
  paddingVertical?: Space;
  gap?: Space;
  rowGap?: Space;
  columnGap?: Space;
  width?: Space;
  height?: Space;
  aspectRatio?: number;
  minWidth?: Space;
  minHeight?: Space;
  maxWidth?: Space;
  maxHeight?: Space;
  top?: Space;
  bottom?: Space;
  left?: Space;
  right?: Space;
  borderRadius?: Radius;
  borderWidth?: Space;
  borderLeftWidth?: Space;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderColor?: Color;
  backgroundColor?: Color;
  opacity?: number;
  overflow?: 'visible' | 'hidden';
  zIndex?: number;
  transform?: readonly [Readonly<{ rotate: Angle }>];
}>;

/** An opaque handle to a token-built style; a primitive's `style` prop accepts nothing else. */
export type StyleRef = Brand<Style, 'StyleRef'>;

/**
 * The only constructor of styles the app has. It takes a table keyed by name and built from the theme in force, and
 * returns a hook: a component calls it to read the current theme's styles, rebuilt only when the theme changes. A table
 * that ignores the theme takes no parameter.
 */
export function createStyles<Definition extends Readonly<Record<string, Style>>>(
  build: (theme: Theme) => Definition,
): () => { readonly [Name in keyof Definition]: StyleRef } {
  const brand = (definition: Definition): { readonly [Name in keyof Definition]: StyleRef } => {
    const branded = (value: unknown): value is { readonly [Name in keyof Definition]: StyleRef } =>
      typeof value === 'object' && value !== null;
    if (branded(definition)) {
      return definition;
    }
    throw new Error('styles invalides');
  };
  return function useStyles(): { readonly [Name in keyof Definition]: StyleRef } {
    const theme = useTheme();
    return useMemo(() => brand(build(theme)), [theme]);
  };
}
