import type { DisplayText } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createStyles } from '../../../lib/styles';

const useStyles = createStyles((theme) => ({
  target: { minHeight: SPACING.xxxl, justifyContent: 'center' },
  track: { height: SPACING.xs, backgroundColor: theme.rule, borderRadius: RADII.pill },
  fill: { height: SPACING.xs, backgroundColor: theme.primary, borderRadius: RADII.pill },
  knob: {
    position: 'absolute',
    width: SPACING.lg,
    height: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
  },
}));
const bounded = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

/** A touch-and-drag progress control, with the same increments offered to VoiceOver and TalkBack. */
export function Scrubber({
  value,
  label,
  onChange,
  step = 0.05,
}: Readonly<{ value: number; label: DisplayText; onChange: (fraction: number) => void; step?: number }>): ReactNode {
  const styles = useStyles();
  const fraction = useSharedValue(bounded(value));
  const width = useSharedValue(0);
  const dragging = useSharedValue(false);
  useEffect(() => {
    if (!dragging.get()) {
      fraction.set(bounded(value));
    }
  }, [value, fraction, dragging]);
  const move = (x: number): void => {
    'worklet';
    if (width.get() > 0) {
      fraction.set(bounded(x / width.get()));
    }
  };
  const drag = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      dragging.set(true);
      move(event.x);
    })
    .onUpdate((event) => {
      move(event.x);
    })
    .onEnd(() => {
      scheduleOnRN(onChange, fraction.get());
    })
    .onFinalize(() => {
      dragging.set(false);
    });
  const fill = useAnimatedStyle(() => ({ width: width.get() * fraction.get() }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, (width.get() - SPACING.lg) * fraction.get()) }],
  }));
  return (
    <GestureDetector gesture={drag}>
      <View
        style={styles.target}
        onLayout={(event) => {
          width.set(event.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(bounded(value) * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          onChange(bounded(value + (event.nativeEvent.actionName === 'increment' ? step : -step)));
        }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </GestureDetector>
  );
}
