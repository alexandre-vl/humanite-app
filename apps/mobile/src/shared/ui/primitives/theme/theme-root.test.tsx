import type { ThemeChoice } from '@huma/design-tokens';
import { PALETTE } from '@huma/design-tokens';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';
import type { ReactNode } from 'react';
import { Appearance, Text } from 'react-native';
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

beforeEach(() => {
  jest.mocked(setBackgroundColorAsync).mockClear();
});

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

  /**
   * Every screen lays a ground of its own, but the window shows around and under them all — behind the transparent
   * bars of an edge-to-edge window, and between the splash going and the first screen arriving. Left at the white the
   * native project is built with, it frames a paper printed dark in white.
   */
  it('peint la fenêtre du système de la même couleur que le papier', async () => {
    await groundUnder('dark');
    expect(jest.mocked(setBackgroundColorAsync)).toHaveBeenCalledWith(PALETTE.darkBackground);
  });

  /**
   * What the platform draws itself — a switch, the keyboard, an alert — takes the phone's appearance until it is told
   * the paper's. Left to a light phone, the track of a switch set off was darkened to 2,81 to 1 against the dark page
   * the reader had chosen; and a reader who chose nothing is left to the phone, which the page follows too.
   */
  it('dit au système le thème que le lecteur a choisi, et rien quand il n’en a choisi aucun', async () => {
    const told = jest.spyOn(Appearance, 'setColorScheme');
    const view = await render(
      <ThemeRoot choice="dark">
        <GroundProbe />
      </ThemeRoot>,
    );
    expect(told).toHaveBeenLastCalledWith('dark');
    await view.rerender(
      <ThemeRoot choice="system">
        <GroundProbe />
      </ThemeRoot>,
    );
    expect(told).toHaveBeenLastCalledWith('unspecified');
  });
});
