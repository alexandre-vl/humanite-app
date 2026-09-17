/** A value only a constructor of this module can produce: a plain number or string is not a token. */
declare const brand: unique symbol;
type Brand<Value, Name extends string> = Value & Readonly<{ [brand]: Name }>;

export type Space = Brand<number, 'Space'>;
export type Radius = Brand<number, 'Radius'>;
export type FontSize = Brand<number, 'FontSize'>;
export type LineHeight = Brand<number, 'LineHeight'>;
export type Duration = Brand<number, 'Duration'>;
export type FontWeight = Brand<string, 'FontWeight'>;
export type Color = Brand<string, 'Color'>;

const HEX = /^#[0-9a-f]{6}$/u;
const WEIGHT = /^[1-9]00$/u;
const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

const isSpace = (value: number): value is Space => isFiniteNonNegative(value);
const isRadius = (value: number): value is Radius => isFiniteNonNegative(value);
const isFontSize = (value: number): value is FontSize => Number.isFinite(value) && value > 0;
const isLineHeight = (value: number): value is LineHeight => Number.isFinite(value) && value > 0;
const isDuration = (value: number): value is Duration => isFiniteNonNegative(value);
const isFontWeight = (value: string): value is FontWeight => WEIGHT.test(value);
const isColor = (value: string): value is Color => HEX.test(value);

const invalid = (kind: string, value: number | string): never => {
  throw new RangeError(`${kind} invalide : ${String(value)}`);
};

export const space = (value: number): Space => (isSpace(value) ? value : invalid('espace', value));
export const radius = (value: number): Radius => (isRadius(value) ? value : invalid('rayon', value));
export const fontSize = (value: number): FontSize => (isFontSize(value) ? value : invalid('taille', value));
export const lineHeight = (value: number): LineHeight => (isLineHeight(value) ? value : invalid('interligne', value));
export const duration = (value: number): Duration => (isDuration(value) ? value : invalid('durée', value));
export const fontWeight = (value: string): FontWeight => (isFontWeight(value) ? value : invalid('graisse', value));
export const color = (value: string): Color => (isColor(value) ? value : invalid('couleur', value));
