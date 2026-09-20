import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { preventAutoHideAsync } from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { StartupProvider } from '#lib/startup';
import { chromeOptions, useTheme } from '#lib/styles';
import { SafeAreaRoot } from '#primitives/safe-area';
import { persistOptions, queryClient } from '../model/query-client';
import { ReaderSettings } from './reader-settings';
import { StartupGate } from './startup-gate';

void preventAutoHideAsync();

/**
 * The stack of pushed screens, in the colours in force.
 *
 * A native header is drawn by the platform and takes none of the style table the app builds, so the colours it needs
 * come from the one constructor that names them — or it stays the system's white slab over a paper printed dark.
 */
function ThemedStack(): ReactNode {
  return (
    <Stack screenOptions={chromeOptions(useTheme())}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
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
          </ReaderSettings>
        </StartupGate>
      </StartupProvider>
    </PersistQueryClientProvider>
  );
}
