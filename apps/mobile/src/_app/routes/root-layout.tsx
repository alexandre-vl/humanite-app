import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { preventAutoHideAsync } from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { READER } from '#api';
import { ListeningPlayer } from '#features/listen';
import { Box } from '#primitives/box';
import { ListeningLifecycle } from './listening-lifecycle';
import { resumeAlerts } from '#features/alerts';
import { StartupProvider } from '#lib/startup';
import { chromeOptions, createStyles, useTheme } from '#lib/styles';
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
 * Each screen draws its own bar. The picture uses this stack too: Expo's native zoom transition and its
 * gesture bounds work on a pushed screen, which still covers the article in full.
 */
function ThemedStack(): ReactNode {
  return <Stack screenOptions={chromeOptions(useTheme())} />;
}

const useStyles = createStyles(() => ({ fill: { flex: 1 } }));

export function RootLayout(): ReactNode {
  const styles = useStyles();
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <StartupProvider>
        <StartupGate>
          <ReaderSettings>
            <SafeAreaRoot>
              <Box style={styles.fill}>
                <ThemedStack />
              </Box>
              <ListeningPlayer />
              <ListeningLifecycle />
            </SafeAreaRoot>
            <AlertsFollower />
          </ReaderSettings>
        </StartupGate>
      </StartupProvider>
    </PersistQueryClientProvider>
  );
}
