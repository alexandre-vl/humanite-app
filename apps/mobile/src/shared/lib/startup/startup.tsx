import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Startup = Readonly<{ firstLayoutDone: boolean; signalFirstLayout: () => void }>;

const StartupContext = createContext<Startup | null>(null);

/** What a ground signals with when nobody is holding a splash for it. */
const UNHEARD = (): void => {
  // Nothing waits on this layout, so there is nothing to tell.
};

/** Carries the first screen's first layout across the app–page boundary, which imports may not cross directly. */
export function StartupProvider({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const [firstLayoutDone, setFirstLayoutDone] = useState(false);
  const signalFirstLayout = useCallback((): void => {
    setFirstLayoutDone(true);
  }, []);
  const value = useMemo<Startup>(() => ({ firstLayoutDone, signalFirstLayout }), [firstLayoutDone, signalFirstLayout]);
  return <StartupContext value={value}>{children}</StartupContext>;
}

/**
 * What a screen's ground calls once it has been laid out. Unlike reading the signal, sending it does not require the
 * provider: a ground is rendered by component tests and by the catalogue too, where no splash is waiting, and no
 * ground should have to know whether anyone is listening.
 */
export function useFirstLayoutSignal(): () => void {
  return use(StartupContext)?.signalFirstLayout ?? UNHEARD;
}

export function useStartup(): Startup {
  const startup = use(StartupContext);
  if (startup === null) {
    throw new Error('useStartup hors de StartupProvider');
  }
  return startup;
}
