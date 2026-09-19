import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsRestoringProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StartupProvider, useFirstLayoutSignal } from '#lib/startup';
import { StartupGate } from './startup-gate';

/**
 * A ground reporting its layout. It stands in for the real one because `onLayout` never fires under a headless
 * renderer; that the ground reports at all is proved where the ground lives, in `primitives/surface`.
 */
function GroundProbe(): ReactNode {
  const signalFirstLayout = useFirstLayoutSignal();
  useEffect(() => {
    signalFirstLayout();
  }, [signalFirstLayout]);
  return null;
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
});
