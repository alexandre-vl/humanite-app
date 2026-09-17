import type { Brand, Color, FontFamily, FontSize, Radius, Space } from '@huma/design-tokens';

/**
 * A style built only from design tokens: every value that carries a dimension or a colour is a branded token, so a raw
 * number or string cannot reach a native view. Layout keywords stay plain, the way React Native types them. There is no
 * lineHeight: the tokens are multipliers, while React Native's lineHeight is absolute points the Text primitive derives.
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
  borderColor?: Color;
  backgroundColor?: Color;
  color?: Color;
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  opacity?: number;
  overflow?: 'visible' | 'hidden';
  zIndex?: number;
}>;

/** An opaque handle to a token-built style; a primitive's `style` prop accepts nothing else. */
export type StyleRef = Brand<Style, 'StyleRef'>;

/** Turns a table of token-built styles into style handles: the only constructor of styles the app has. */
export function createStyles<Definition extends Readonly<Record<string, Style>>>(
  definition: Definition,
): { readonly [Name in keyof Definition]: StyleRef } {
  const branded = (value: unknown): value is { readonly [Name in keyof Definition]: StyleRef } =>
    typeof value === 'object' && value !== null;
  if (branded(definition)) {
    return definition;
  }
  throw new Error('styles invalides');
}
