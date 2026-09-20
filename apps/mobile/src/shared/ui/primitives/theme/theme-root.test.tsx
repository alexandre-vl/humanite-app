import type { ThemeChoice } from '@huma/design-tokens';
import { PALETTE } from '@huma/design-tokens';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../../lib/styles';
import { ThemeRoot } from './theme-root';

/** A subtree that says which ground it was given to paint on. */
function GroundProbe(): ReactNode {
  return <Text>{useTheme().background}</Text>;
}

const groundUnder = async (choice: ThemeChoice): Promise<void> => {
  await render(
    <ThemeRoot choice={choice}>
      <GroundProbe />
    </ThemeRoot>,
  );
};

describe('ThemeRoot', () => {
  it('peint dans le thème que le lecteur a choisi, quel que soit celui du téléphone', async () => {
    await groundUnder('dark');
    expect(screen.getByText(PALETTE.darkBackground)).toBeTruthy();
  });

  it('peint dans l’autre quand c’est l’autre qu’il a choisi', async () => {
    await groundUnder('light');
    expect(screen.getByText(PALETTE.white)).toBeTruthy();
  });

  /** The harness reports no scheme, which is the light one: a reader who chose neither follows the phone, not a theme. */
  it('suit le téléphone tant que le lecteur n’a rien choisi', async () => {
    await groundUnder('system');
    expect(screen.getByText(PALETTE.white)).toBeTruthy();
  });
});
