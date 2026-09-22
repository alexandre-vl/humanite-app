import { useIsRestoring } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useStartup } from '#lib/startup';
import { FONTS } from '../model/fonts';

/**
 * Holds the native splash until the cache is restored, the fonts are loaded and the first screen has laid out — and holds
 * the screen itself until the fonts are there.
 *
 * Text is measured once, when it is laid out, and never again: a line laid out before its face is registered keeps the
 * width the fallback gave it and is then painted in the real one, which on a cold start cut « Politique » to
 * « Politiqu » and a date to its first three figures. Behind the splash that is invisible, and it is exactly the layout
 * the reader is shown when the splash lifts.
 *
 * Nothing is rendered until the faces are in, therefore — and the splash waits on the first layout of what comes after,
 * so the two must be kept this way round: gate the render on the layout and neither would ever happen.
 *
 * A face that fails to load opens the gate all the same. The app then reads in the system's own letters, which is worse
 * than the paper's and far better than a splash that never lifts.
 */
export function StartupGate({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const isRestoring = useIsRestoring();
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const { firstLayoutDone } = useStartup();
  const facesSettled = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (!isRestoring && facesSettled && firstLayoutDone) {
      void hideAsync();
    }
  }, [isRestoring, facesSettled, firstLayoutDone]);
  return facesSettled ? children : null;
}
