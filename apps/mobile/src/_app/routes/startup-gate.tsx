import { useIsRestoring } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useStartup } from '#lib/startup';
import { FONTS } from '../model/fonts';

/** Holds the native splash until the cache is restored, the fonts are loaded and the feed has laid out once. */
export function StartupGate({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const isRestoring = useIsRestoring();
  const [fontsLoaded] = useFonts(FONTS);
  const { firstLayoutDone } = useStartup();
  useEffect(() => {
    if (!isRestoring && fontsLoaded && firstLayoutDone) {
      void hideAsync();
    }
  }, [isRestoring, fontsLoaded, firstLayoutDone]);
  return children;
}
