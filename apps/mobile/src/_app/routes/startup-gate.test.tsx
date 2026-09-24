import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IsRestoringProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { t as words } from '#i18n';
import { StartupProvider, useFirstLayoutSignal } from '#lib/startup';
import { asDisplayText } from '#lib/display-text';
import { Text } from '#primitives/text';
import { StartupGate } from './startup-gate';

const PAPER = 'le journal';

/** Past the 650 ms the opening is held for, so what is still on screen after it is there for a reason and not a race. */
const LONGER_THAN_THE_FLOOR = 1_000;

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
    jest.mocked(hideAsync).mockReset();
    jest.mocked(hideAsync).mockResolvedValue();
    jest.mocked(useFonts).mockReturnValue([true, null]);
  });

  /**
   * The phone's splash is handed over as soon as the faces are in, and not held to the end of the start. It cannot
   * fade and cannot be drawn in a face the app loads, so holding it would have meant a blank field for as long as
   * the start takes and then a cut. What waits on the rest is the app's own opening, on the same ground.
   */
  it('rend la main au splash du téléphone dès que les fontes sont là', async () => {
    await renderGate(true, null);
    await waitFor(() => {
      expect(hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('garde l’ouverture tant qu’aucun écran n’a été mesuré', async () => {
    await renderGate(false, null);
    expect(screen.getByText(words('app.name'))).toBeTruthy();
  });

  it('garde l’ouverture tant que le cache se restaure', async () => {
    await renderGate(true, <GroundProbe />);
    expect(screen.getByText(words('app.name'))).toBeTruthy();
  });

  /** The first page is laid out under the opening, not after it: what lifts is already covering something drawn. */
  it('laisse la première page se poser sous l’ouverture', async () => {
    await renderGate(false, <GroundProbe />);
    expect(screen.getByText(PAPER)).toBeTruthy();
    expect(screen.getByText(words('app.name'))).toBeTruthy();
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

  /**
   * The floor the opening is held for is time on the reader's screen, and the screen is not theirs until the phone
   * has taken its own field away. Counted from the mount instead, it ran out while the app was still painting behind
   * that field: recorded at 30 images per second on 24/09/2026, the masthead reached the screen at 5,47 s and began
   * to fade at 5,53 s — 60 ms, which reads as a fault and not as an opening. Here the phone never answers, so the
   * floor never starts, and what proves it is that the masthead is still up long after it would otherwise have gone.
   */
  it('ne compte le plancher de l’ouverture qu’une fois le téléphone dessaisi', async () => {
    jest.mocked(hideAsync).mockReturnValue(new Promise<void>(() => undefined));
    await renderGate(false, <GroundProbe />);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, LONGER_THAN_THE_FLOOR);
      });
    });
    expect(screen.getByText(words('app.name'))).toBeTruthy();
  });

  /** And once it has gone it is taken down, not left over the page at nought opacity for a screen reader to find. */
  it('retire l’ouverture quand le téléphone s’est dessaisi et que la page est posée', async () => {
    await renderGate(false, <GroundProbe />);
    await waitFor(
      () => {
        expect(screen.queryByText(words('app.name'))).toBeNull();
      },
      { timeout: LONGER_THAN_THE_FLOOR },
    );
    expect(screen.getByText(PAPER)).toBeTruthy();
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
