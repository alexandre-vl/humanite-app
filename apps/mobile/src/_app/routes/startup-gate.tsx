import { useIsRestoring } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { hideAsync } from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStartup } from '#lib/startup';
import { FONTS } from '../model/fonts';
import { Opening } from './opening';

/**
 * Holds the native splash until the cache is restored, the fonts are loaded and the first screen has laid out — and holds
 * the screen itself until the fonts are there.
 *
 * Text is measured once, when it is laid out, and never again: a line laid out before its face is registered keeps the
 * width the fallback gave it and is then painted in the real one, which on a cold start cut « Politique » to
 * « Politiqu » and a date to its first three figures. Behind the splash that is invisible, and it is exactly the layout
 * the reader is shown when the splash lifts.
 *
 * Nothing is rendered until the faces are in, therefore — and what lifts waits on the first layout of what comes
 * after, so the two must be kept this way round: gate the render on the layout and neither would ever happen.
 *
 * A face that fails to load opens the gate all the same. The app then reads in the system's own letters, which is worse
 * than the paper's and far better than an opening that never lifts.
 *
 * The phone's own splash is handed over as soon as the faces are in, and not held to the end. What replaces it is the
 * app's opening, on the very same ground and with the paper's name on it, over a first page that is laying itself out
 * underneath; when that page is ready the opening rises off it. The phone's splash cannot fade and cannot be drawn in
 * a face the app loads, so holding it to the end would have meant a blank field for as long as the start takes and
 * then a cut. This way there is one field of paper from the press of the icon to the front page, and one thing fades.
 *
 * Asking for the handover is not the same as getting it. Everything this renders is painted behind the phone's field
 * while that field is still up, and the phone takes it away when it is ready to: 640 ms after the ask, in a recording
 * of a cold launch made at 30 images per second on 24/09/2026. What the opening owes the reader is time on their
 * screen, so the answer to the ask — and not the ask — is what says the screen has become theirs.
 */
export function StartupGate({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const isRestoring = useIsRestoring();
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const { firstLayoutDone } = useStartup();
  const [uncovered, setUncovered] = useState(false);
  const facesSettled = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (!facesSettled) {
      return;
    }
    // Either answer says the same thing: the phone's field is not in front of this any more. A platform that refuses
    // the ask has no splash to hide, and waiting on a promise that will never keep would leave the opening up for good.
    const handedOver = (): void => {
      setUncovered(true);
    };
    void hideAsync().then(handedOver, handedOver);
  }, [facesSettled]);
  if (!facesSettled) {
    return null;
  }
  return (
    <>
      {children}
      <Opening shown={uncovered} ready={!isRestoring && firstLayoutDone} />
    </>
  );
}
