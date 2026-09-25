import type { PhoneText, TextScale } from '@huma/design-tokens';
import { FONT_FAMILIES, UNMOVED_PHONE } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import type { Typesetting } from '../../../lib/styles';
import { TypesettingProvider } from '../../../lib/styles';
import { styleOf } from '../../../lib/testing';
import { Text } from './text';

const WORDS = 'le journal';

/** How a run of body text was set, read back from the style it gave the native text. */
const setAs = async (typesetting: Typesetting): Promise<Readonly<Record<string, unknown>>> => {
  await render(
    <TypesettingProvider typesetting={typesetting}>
      <Text variant="body">{asDisplayText(WORDS)}</Text>
    </TypesettingProvider>,
  );
  return styleOf(screen.getByText(WORDS));
};

const paperAt = async (scale: TextScale): Promise<Readonly<Record<string, unknown>>> =>
  setAs({ scale, faces: 'paper', phone: UNMOVED_PHONE });

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
    const own = await setAs({ scale: 'large', faces: 'paper', phone: UNMOVED_PHONE });
    const legible = await setAs({ scale: 'large', faces: 'legible', phone: UNMOVED_PHONE });
    expect(own['fontFamily']).toBe(FONT_FAMILIES.paper.regular);
    expect(legible['fontFamily']).toBe(FONT_FAMILIES.legible.regular);
    expect(legible['fontSize']).toBe(own['fontSize']);
  });

  /**
   * The phone's own text size grows the reader's step, in the style itself; the platform is told not to apply it again,
   * or every word would print at the square of it. The paper's name is the one role it does not reach.
   */
  it('prend la taille de texte du téléphone, sans la laisser appliquer une seconde fois', async () => {
    const largest: PhoneText = { system: 'ios', category: 'ax5' };
    expect((await setAs({ scale: 'normal', faces: 'paper', phone: largest }))['fontSize']).toBe(51);
    expect(screen.getByText(WORDS).props['allowFontScaling']).toBe(false);
  });

  it('garde au nom du journal sa taille, quelle que soit celle du téléphone', async () => {
    await render(
      <TypesettingProvider typesetting={{ scale: 'normal', faces: 'paper', phone: { system: 'ios', category: 'ax5' } }}>
        <Text variant="masthead">{asDisplayText('L’Humanité')}</Text>
      </TypesettingProvider>,
    );
    expect(styleOf(screen.getByText('L’Humanité'))['fontSize']).toBe(28);
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

  /**
   * A refusal that appears under a button is silent to a reader who is listening: their focus is still on the button.
   * The line says so itself, so the platform reads it where it stands rather than moving anyone.
   */
  it('se fait lire là où elle est quand elle vient d’arriver, sans prendre le focus', async () => {
    await render(<Text alert>{asDisplayText('Identifiant refusé')}</Text>);
    const line = screen.getByText('Identifiant refusé');
    expect(line.props['accessibilityRole']).toBe('alert');
    expect(line.props['accessibilityLiveRegion']).toBe('assertive');
  });

  it('ne dit rien de tel d’une ligne qui était déjà là', async () => {
    await render(<Text>{asDisplayText('Une ligne ordinaire')}</Text>);
    const line = screen.getByText('Une ligne ordinaire');
    expect(line.props['accessibilityRole']).toBeUndefined();
    expect(line.props['accessibilityLiveRegion']).toBeUndefined();
  });
});
