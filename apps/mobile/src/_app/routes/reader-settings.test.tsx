import { PALETTE, typographyAt } from '@huma/design-tokens';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { usePreferences } from '#features/preferences';
import { asDisplayText } from '#lib/display-text';
import { useTheme, useTypesetting } from '#lib/styles';
import { styleOf } from '#lib/testing';
import { Text } from '#primitives/text';
import { ReaderSettings } from './reader-settings';

const WORDS = 'le journal';

/**
 * A subtree set the way the reader asked: a run of body text, the step and faces it was set in with the size the
 * tokens give body text there, and the ground it was given to paint on.
 */
function Probe(): ReactNode {
  const { scale, faces, phone } = useTypesetting();
  return (
    <>
      <Text variant="body">{asDisplayText(WORDS)}</Text>
      <Text variant="body">
        {asDisplayText(`${scale} ${faces} ${String(typographyAt('body', scale, faces, phone).size)}`)}
      </Text>
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
const letters = (): Readonly<Record<string, unknown>> => styleOf(screen.getByText(WORDS));

/** The size the run of body text was set at. */
const size = (): number => Number(letters()['fontSize']);

beforeEach(() => {
  usePreferences.getState().reset();
});

describe('ReaderSettings', () => {
  /**
   * The size is read against what the tokens give rather than as a number of points, because the phone's text size
   * grows every size and is the typesetting root's to answer for: what this owes is the step and the faces the store
   * holds, and that a change of them reaches a text already on the screen.
   */
  it('imprime au cran et dans le jeu de faces que le magasin porte', async () => {
    await print();
    const own = size();
    expect(screen.getByText(`normal paper ${String(own)}`)).toBeTruthy();
    await act(() => {
      usePreferences.setState({ scale: 'huge', faces: 'legible' });
    });
    expect(screen.getByText(`huge legible ${String(size())}`)).toBeTruthy();
    expect(size()).toBeGreaterThan(own);
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
    expect(letters()['fontFamily']).toBe('Overpass_400Regular');
  });
});
