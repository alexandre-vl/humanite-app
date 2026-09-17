import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaRoot } from '#primitives/safe-area';
import { persistOptions, queryClient } from '../model/query-client';

export function RootLayout(): ReactNode {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SafeAreaRoot>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaRoot>
    </PersistQueryClientProvider>
  );
}
