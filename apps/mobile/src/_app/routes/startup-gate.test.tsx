import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsRestoringProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StartupProvider, useFirstLayoutSignal } from '#lib/startup';
import { asDisplayText } from '#lib/display-text';
import { Text } from '#primitives/text';
import { StartupGate } from './startup-gate';

const PAPER = 'le journal';

/**
 * A ground reporting its layout, with something on it. It stands in for the real one because `onLayout` never fires
 * under a headless renderer; that the ground reports at all is proved where the ground lives, in `primitives/surface`.
 */
function GroundProbe(): ReactNode {
  const signalFirstLayout = useFirstLayoutSignal();
  useEffect(() => {
    signalFirstLayout();
  }, [signalFirstLayout]);
  return <Text variant="body">{asDisplayText(PAPER)}</Text>;
}

const renderGate = async (isRestoring: boolean, ground: ReactNode): Promise<void> => {
  await render(
    <IsRestoringProvider value={isRestoring}>
      <StartupProvider>
        <StartupGate>{ground}</StartupGate>
      </StartupProvider>
    </IsRestoringProvider>,
  );
};

describe('StartupGate', () => {
  beforeEach(() => {
    jest.mocked(hideAsync).mockClear();
    jest.mocked(useFonts).mockReturnValue([true, null]);
  });

  it('cache le splash quand cache restauré, polices chargées et écran mesuré', async () => {
    await renderGate(false, <GroundProbe />);
    await waitFor(() => {
      expect(hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('garde le splash tant qu’aucun écran n’a été mesuré', async () => {
    await renderGate(false, null);
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it('garde le splash tant que le cache se restaure', async () => {
    await renderGate(true, <GroundProbe />);
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it('garde le splash tant que les polices se chargent', async () => {
    jest.mocked(useFonts).mockReturnValue([false, null]);
    await renderGate(false, <GroundProbe />);
    expect(hideAsync).not.toHaveBeenCalled();
  });

  /**
   * Measured on the phone before this held: a text laid out before its face is registered keeps the width the fallback
   * gave it and is then painted in the real one — « Politique » came out « Politiqu », a date lost its last figure.
   * Behind the splash that is invisible, and it is exactly the layout the reader is shown when the splash lifts.
   */
  it('ne montre rien tant que les fontes ne sont pas là, une mise en page ne se refaisant pas', async () => {
    jest.mocked(useFonts).mockReturnValue([false, null]);
    await renderGate(false, <GroundProbe />);
    expect(screen.queryByText(PAPER)).toBeNull();
  });

  it('ouvre quand même sur une fonte en échec, plutôt que de ne jamais lever le splash', async () => {
    jest.mocked(useFonts).mockReturnValue([false, new Error('fonte introuvable')]);
    await renderGate(false, <GroundProbe />);
    expect(screen.getByText(PAPER)).toBeTruthy();
    await waitFor(() => {
      expect(hideAsync).toHaveBeenCalledTimes(1);
    });
  });
});
