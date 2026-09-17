import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Startup = Readonly<{ firstLayoutDone: boolean; signalFirstLayout: () => void }>;

const StartupContext = createContext<Startup | null>(null);

/** Carries the feed's first layout across the app–page boundary, which imports may not cross directly. */
export function StartupProvider({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const [firstLayoutDone, setFirstLayoutDone] = useState(false);
  const signalFirstLayout = useCallback((): void => {
    setFirstLayoutDone(true);
  }, []);
  const value = useMemo<Startup>(() => ({ firstLayoutDone, signalFirstLayout }), [firstLayoutDone, signalFirstLayout]);
  return <StartupContext value={value}>{children}</StartupContext>;
}

export function useStartup(): Startup {
  const startup = use(StartupContext);
  if (startup === null) {
    throw new Error('useStartup hors de StartupProvider');
  }
  return startup;
}
