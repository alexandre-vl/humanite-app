import type { TextScale } from '@huma/design-tokens';
import { FONT_FAMILIES } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import type { Typesetting } from '../../../lib/styles';
import { TypesettingProvider } from '../../../lib/styles';
import { Text } from './text';

const WORDS = 'le journal';

const isStyle = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** How a run of body text was set, read back from the style it gave the native text. */
const setAs = async (typesetting: Typesetting): Promise<Readonly<Record<string, unknown>>> => {
  await render(
    <TypesettingProvider typesetting={typesetting}>
      <Text variant="body">{asDisplayText(WORDS)}</Text>
    </TypesettingProvider>,
  );
  const style: unknown = screen.getByText(WORDS).props['style'];
  if (!isStyle(style)) {
    throw new Error('le texte ne porte pas de style lisible');
  }
  return style;
};

const paperAt = async (scale: TextScale): Promise<Readonly<Record<string, unknown>>> =>
  setAs({ scale, faces: 'paper' });

describe('Text', () => {
  it('se règle sur le cran que le lecteur a posé, jusqu’à la fonte', async () => {
    expect((await paperAt('normal'))['fontSize']).toBe(16);
    expect((await paperAt('small'))['fontSize']).toBe(14);
    expect((await paperAt('huge'))['fontSize']).toBe(20);
  });

  /**
   * A line height is a multiple of a size, not a length of its own: it follows a step for nothing, and a paragraph set
   * larger keeps the air between its lines rather than crowding them.
   */
  it('écarte les lignes à proportion, le cran montant', async () => {
    expect((await paperAt('normal'))['lineHeight']).toBeCloseTo(25.6); // 16 × 1.6
    expect((await paperAt('huge'))['lineHeight']).toBeCloseTo(32); // 20 × 1.6
  });

  it('se met dans le jeu de faces demandé, sans toucher à la taille', async () => {
    const own = await setAs({ scale: 'large', faces: 'paper' });
    const legible = await setAs({ scale: 'large', faces: 'legible' });
    expect(own['fontFamily']).toBe(FONT_FAMILIES.paper.regular);
    expect(legible['fontFamily']).toBe(FONT_FAMILIES.legible.regular);
    expect(legible['fontSize']).toBe(own['fontSize']);
  });

  /**
   * A line that opens what follows it says so, which is how a reader listening to the paper moves through it: a screen
   * reader offers to jump from one heading to the next, and a page with none can only be walked word by word. Read on
   * the role the native text carries, because that is the whole of what the platform is told.
   */
  it('annonce qu’elle ouvre ce qui la suit, quand elle l’ouvre', async () => {
    await render(<Text heading>{asDisplayText(WORDS)}</Text>);
    expect(screen.getByText(WORDS).props['accessibilityRole']).toBe('header');
  });

  it('n’annonce rien de tel quand elle n’ouvre rien', async () => {
    await render(<Text>{asDisplayText(WORDS)}</Text>);
    expect(screen.getByText(WORDS).props['accessibilityRole']).toBeUndefined();
  });
});
