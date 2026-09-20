import { PALETTE } from '@huma/design-tokens';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { usePreferences } from '#features/preferences';
import { asDisplayText } from '#lib/display-text';
import { useTheme } from '#lib/styles';
import { Text } from '#primitives/text';
import { ReaderSettings } from './reader-settings';

const WORDS = 'le journal';

const isStyle = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** A subtree set the way the reader asked: a run of body text, and the ground it was given to paint on. */
function Probe(): ReactNode {
  return (
    <>
      <Text variant="body">{asDisplayText(WORDS)}</Text>
      <Text variant="body">{asDisplayText(useTheme().background)}</Text>
    </>
  );
}

const print = async (): Promise<void> => {
  await render(
    <ReaderSettings>
      <Probe />
    </ReaderSettings>,
  );
};

/** How the run of body text was set, read back from the style it gave the native text. */
const letters = (): Readonly<Record<string, unknown>> => {
  const style: unknown = screen.getByText(WORDS).props['style'];
  if (!isStyle(style)) {
    throw new Error('le texte ne porte pas de style lisible');
  }
  return style;
};

beforeEach(() => {
  usePreferences.getState().reset();
});

describe('ReaderSettings', () => {
  it('imprime au cran et dans le jeu de faces que le magasin porte', async () => {
    usePreferences.setState({ scale: 'huge', faces: 'legible' });
    await print();
    expect(letters()['fontSize']).toBe(20);
    expect(letters()['fontFamily']).toBe('AtkinsonHyperlegible_400Regular');
  });

  /** A theme chosen by the reader wins over the phone's, which the harness reports as the light one. */
  it('peint dans le thème que le magasin porte, par-dessus celui du téléphone', async () => {
    usePreferences.setState({ theme: 'dark' });
    await print();
    expect(screen.getByText(PALETTE.darkBackground)).toBeTruthy();
  });

  it('rend au journal ses propres réglages quand le lecteur n’a rien posé', async () => {
    await print();
    expect(letters()['fontSize']).toBe(16);
    expect(letters()['fontFamily']).toBe('Overpass_400Regular');
  });
});
