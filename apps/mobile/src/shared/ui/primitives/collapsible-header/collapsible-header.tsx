import type { ReactNode } from 'react';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SIZES, SPACING } from '@huma/design-tokens';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';
import { collapseDistance, collapseProgress, lerp } from './geometry';

export type CollapsibleHeaderProps = Readonly<{
  header?: ReactNode;
  sticky?: ReactNode;
  children?: ReactNode;
  style?: StyleRef;
}>;

const styles = createStyles({
  frame: { flex: 1 },
  content: { paddingTop: SIZES.headerBlock },
  masthead: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.headerExpanded,
    overflow: 'hidden',
  },
  sticky: {
    position: 'absolute',
    top: SIZES.headerExpanded,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.sectionBar,
  },
});

const DISTANCE = collapseDistance(SIZES.headerExpanded, SIZES.headerCollapsed);

/** A header whose `header` band fades and slides away as `children` scroll, leaving the `sticky` band pinned at the top. */
export function CollapsibleHeader({ header, sticky, children, style }: CollapsibleHeaderProps): ReactNode {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const mastheadStyle = useAnimatedStyle(() => {
    const progress = collapseProgress(scrollY.get(), DISTANCE);
    return { opacity: lerp(1, 0, progress), transform: [{ translateY: lerp(0, -DISTANCE, progress) }] };
  });
  const stickyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lerp(0, -DISTANCE, collapseProgress(scrollY.get(), DISTANCE)) }],
  }));
  return (
    <Animated.View style={[styles.frame, style]}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
        {children}
      </Animated.ScrollView>
      <Animated.View style={[styles.masthead, mastheadStyle]}>{header}</Animated.View>
      <Animated.View style={[styles.sticky, stickyStyle]}>{sticky}</Animated.View>
    </Animated.View>
  );
}
