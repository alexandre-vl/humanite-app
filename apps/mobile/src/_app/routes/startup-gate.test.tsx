import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsRestoringProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StartupProvider, useStartup } from '#lib/startup';
import { StartupGate } from './startup-gate';

/** Signals the feed's first layout on mount, standing in for the home screen. */
function LayoutProbe(): ReactNode {
  const { signalFirstLayout } = useStartup();
  useEffect(() => {
    signalFirstLayout();
  }, [signalFirstLayout]);
  return null;
}

const renderGate = async (isRestoring: boolean, probe: ReactNode): Promise<void> => {
  await render(
    <IsRestoringProvider value={isRestoring}>
      <StartupProvider>
        <StartupGate>{probe}</StartupGate>
      </StartupProvider>
    </IsRestoringProvider>,
  );
};

describe('StartupGate', () => {
  beforeEach(() => {
    jest.mocked(hideAsync).mockClear();
    jest.mocked(useFonts).mockReturnValue([true, null]);
  });

  it('cache le splash quand cache restauré, polices chargées et fil mesuré', async () => {
    await renderGate(false, <LayoutProbe />);
    await waitFor(() => {
      expect(hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('garde le splash tant que le cache se restaure', async () => {
    await renderGate(true, <LayoutProbe />);
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it('garde le splash tant que les polices se chargent', async () => {
    jest.mocked(useFonts).mockReturnValue([false, null]);
    await renderGate(false, <LayoutProbe />);
    expect(hideAsync).not.toHaveBeenCalled();
  });
});
