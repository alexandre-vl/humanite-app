import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { preventAutoHideAsync } from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { usePreferences } from '#features/preferences';
import { StartupProvider } from '#lib/startup';
import { TypesettingProvider, useTheme } from '#lib/styles';
import { SafeAreaRoot } from '#primitives/safe-area';
import { ThemeRoot } from '#primitives/theme';
import { persistOptions, queryClient } from '../model/query-client';
import { StartupGate } from './startup-gate';

void preventAutoHideAsync();

/**
 * The stack of pushed screens, in the colours in force.
 *
 * A native header is drawn by the platform and takes none of the style table the app builds — it is handed the two
 * colours it needs, from the same theme as everything else, or it stays the system's white slab over a paper printed
 * dark. The ground behind a screen is given for the same reason: what shows between two screens is the stack's, not
 * the screen's.
 */
function ThemedStack(): ReactNode {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * The whole app, printed the way the reader asked for it.
 *
 * This is the one place that reads what they set, because it is the one place allowed to: the settings are kept by a
 * store, a store belongs to the layer of actions, and neither a primitive nor a shared library may reach that layer.
 * Below here, a theme and a typesetting travel on contexts of their own and every style resolves through them, so no
 * screen and no component ever names a setting.
 */
function AsTheReaderAsked({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const choice = usePreferences((settings) => settings.theme);
  const scale = usePreferences((settings) => settings.scale);
  const faces = usePreferences((settings) => settings.faces);
  return (
    <ThemeRoot choice={choice}>
      <TypesettingProvider typesetting={{ scale, faces }}>{children}</TypesettingProvider>
    </ThemeRoot>
  );
}

export function RootLayout(): ReactNode {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <StartupProvider>
        <StartupGate>
          <AsTheReaderAsked>
            <SafeAreaRoot>
              <ThemedStack />
            </SafeAreaRoot>
          </AsTheReaderAsked>
        </StartupGate>
      </StartupProvider>
    </PersistQueryClientProvider>
  );
}
