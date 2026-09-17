import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { preventAutoHideAsync } from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { StartupProvider } from '#lib/startup';
import { SafeAreaRoot } from '#primitives/safe-area';
import { persistOptions, queryClient } from '../model/query-client';
import { StartupGate } from './startup-gate';

void preventAutoHideAsync();

export function RootLayout(): ReactNode {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <StartupProvider>
        <StartupGate>
          <SafeAreaRoot>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </SafeAreaRoot>
        </StartupGate>
      </StartupProvider>
    </PersistQueryClientProvider>
  );
}
