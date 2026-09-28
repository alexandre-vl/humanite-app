import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { preventAutoHideAsync } from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { READER } from '#api';
import { resumeAlerts } from '#features/alerts';
import { StartupProvider } from '#lib/startup';
import { chromeOptions, useTheme } from '#lib/styles';
import { SafeAreaRoot } from '#primitives/safe-area';
import { followTheApp } from '../model/focus';
import { forgetThePaperWhenTheReaderChanges } from '../model/paper';
import { persistOptions, queryClient } from '../model/query-client';
import { AlertsFollower } from './alerts-follower';
import { ReaderSettings } from './reader-settings';
import { StartupGate } from './startup-gate';

void preventAutoHideAsync();
followTheApp();
forgetThePaperWhenTheReaderChanges(READER, queryClient);
resumeAlerts();

/**
 * The stack of pushed screens, in the colours in force.
 *
 * No screen is named here any more. The one that was — the tab group, the only screen that asked for no header —
 * said by its exception that the header was the rule; now that every screen draws its own bar, the rule is the
 * exception and the stack is told once, for all of them.
 */
function ThemedStack(): ReactNode {
  return <Stack screenOptions={chromeOptions(useTheme())} />;
}

export function RootLayout(): ReactNode {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <StartupProvider>
        <StartupGate>
          <ReaderSettings>
            <SafeAreaRoot>
              <ThemedStack />
            </SafeAreaRoot>
            <AlertsFollower />
          </ReaderSettings>
        </StartupGate>
      </StartupProvider>
    </PersistQueryClientProvider>
  );
}
