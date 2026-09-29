import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { createStyles } from '../../../lib/styles';

const useStyles = createStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.background },
  dock: { backgroundColor: theme.background },
}));

/** Fill the display: an inset iOS page sheet adds a second, mismatched curve above the device's bottom corners. */
export function AudioSheet({ children, onClose }: Readonly<{ children: ReactNode; onClose: () => void }>): ReactNode {
  const styles = useStyles();
  const still = useReducedMotion();
  return (
    <Modal visible animationType={still ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.screen}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.screen} edges={['top', 'bottom']} accessibilityViewIsModal>
            {children}
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Occupies space below the navigator, so the mini-player cannot cover any article or tab control. */
export function AudioDock({
  children,
  hidden = false,
}: Readonly<{ children: ReactNode; hidden?: boolean }>): ReactNode {
  const styles = useStyles();
  return (
    <SafeAreaView
      style={styles.dock}
      edges={['bottom']}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    >
      <View>{children}</View>
    </SafeAreaView>
  );
}
