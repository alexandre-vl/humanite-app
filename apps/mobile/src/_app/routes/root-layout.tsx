import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaRoot } from '#primitives/safe-area';

export function RootLayout(): ReactNode {
  return (
    <SafeAreaRoot>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaRoot>
  );
}
