import type { TextScale } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { TextScaleProvider } from '../../../lib/styles';
import { Text } from './text';

const WORDS = 'le journal';

const isSet = (value: unknown, field: 'fontSize' | 'lineHeight'): value is Readonly<Record<typeof field, number>> =>
  typeof value === 'object' && value !== null && field in value && typeof Reflect.get(value, field) === 'number';

/** How a run of body text was set, read back from the style it gave the native text. */
const setAt = async (scale: TextScale, field: 'fontSize' | 'lineHeight'): Promise<number> => {
  await render(
    <TextScaleProvider scale={scale}>
      <Text variant="body">{asDisplayText(WORDS)}</Text>
    </TextScaleProvider>,
  );
  const style: unknown = screen.getByText(WORDS).props['style'];
  if (!isSet(style, field)) {
    throw new Error(`le texte ne porte pas de ${field} lisible`);
  }
  return style[field];
};

describe('Text', () => {
  it('se règle sur le cran que le lecteur a posé, jusqu’à la fonte', async () => {
    expect(await setAt('normal', 'fontSize')).toBe(16);
    expect(await setAt('small', 'fontSize')).toBe(14);
    expect(await setAt('huge', 'fontSize')).toBe(20);
  });

  /**
   * A line height is a multiple of a size, not a length of its own: it follows a step for nothing, and a paragraph set
   * larger keeps the air between its lines rather than crowding them.
   */
  it('écarte les lignes à proportion, le cran montant', async () => {
    expect(await setAt('normal', 'lineHeight')).toBeCloseTo(25.6); // 16 × 1.6
    expect(await setAt('huge', 'lineHeight')).toBeCloseTo(32); // 20 × 1.6
  });
});
