import { SIZES, SPACING } from '@huma/design-tokens';
import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';
import { collapseDistance, collapseProgress, lerp } from './geometry';

export type ListProps<Item> = Readonly<{
  items: readonly Item[];
  keyOf: (item: Item) => string;
  typeOf: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  empty?: ReactNode;
  header?: ReactNode;
  sticky?: ReactNode;
  onEndReached?: () => void;
  contentStyle?: StyleRef;
}>;

/** How near the end the scroll gets, as a share of the visible height, before the list asks for the next page. */
const END_THRESHOLD = 0.5;

/** How often the native scroll reports its offset, in milliseconds: one report per frame at 60 Hz. */
const SCROLL_PERIOD = 16;

const DISTANCE = collapseDistance(SIZES.headerExpanded, SIZES.headerCollapsed);

const useStyles = createStyles(() => ({
  frame: { flex: 1 },
  fill: { flex: 1 },
  flush: { paddingTop: SPACING.none },
  underHeader: { paddingTop: SIZES.headerExpanded },
  underSticky: { paddingTop: SIZES.sectionBar },
  underBoth: { paddingTop: SIZES.headerBlock },
  masthead: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.headerExpanded,
    overflow: 'hidden',
  },
  stickyUnderHeader: {
    position: 'absolute',
    top: SIZES.headerExpanded,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.sectionBar,
  },
  stickyAtTop: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.sectionBar,
  },
}));

/** The inset the scrolled content needs: each band the list carries hides its own height at the top. */
const insetOf = (hasHeader: boolean, hasSticky: boolean): 'flush' | 'underHeader' | 'underSticky' | 'underBoth' => {
  if (hasHeader && hasSticky) {
    return 'underBoth';
  }
  if (hasHeader) {
    return 'underHeader';
  }
  if (hasSticky) {
    return 'underSticky';
  }
  return 'flush';
};

/**
 * A virtualised list, under an optional `header` band that fades and slides away as it scrolls and an optional `sticky`
 * band that stays pinned. The bands live here rather than in a header primitive of their own because a screen may hold
 * only one scrolling region — two would fight for the gesture and neither would recycle — and because a primitive may
 * not import another primitive, so whoever owns the scroll must also own what reacts to it.
 *
 * The scroll offset arrives on the JavaScript thread: the list replaces the scroll handler of the view it renders with
 * its own (`@shopify/flash-list/dist/recyclerview/RecyclerView.js`, the `CompatScrollView` element), and calls ours back
 * as a plain listener, so a worklet handler has nowhere to attach.
 *
 * `typeOf` names the tree an item mounts. A cell is only ever handed to an item of the same type, and measured heights
 * are averaged type by type, so two items sharing a type must mount the same components in the same order, and two
 * items of visibly different heights must not share one. It is required rather than optional because the list cannot
 * see what its items render, while the caller always can — and answering `'row'` for a list of identical items says
 * so out loud. An item must keep its type for life: changing it throws the cell away and mounts a new one.
 */
export function List<Item>({
  items,
  keyOf,
  typeOf,
  renderItem,
  empty,
  header,
  sticky,
  onEndReached,
  contentStyle,
}: ListProps<Item>): ReactNode {
  const styles = useStyles();
  const scrollY = useSharedValue(0);
  const hasHeader = header !== undefined;
  // What the header gives back as it collapses, and therefore how far the band under it follows: nothing at all when
  // the list carries no header, since a band that follows nothing has nowhere to go.
  const slide = hasHeader ? DISTANCE : 0;
  const mastheadStyle = useAnimatedStyle(() => {
    const progress = collapseProgress(scrollY.get(), DISTANCE);
    return { opacity: lerp(1, 0, progress), transform: [{ translateY: lerp(0, -DISTANCE, progress) }] };
  });
  const stickyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lerp(0, -slide, collapseProgress(scrollY.get(), DISTANCE)) }],
  }));
  return (
    <Animated.View style={styles.frame}>
      <FlashList
        style={styles.fill}
        data={items}
        keyExtractor={keyOf}
        getItemType={typeOf}
        renderItem={(info) => <>{renderItem(info.item)}</>}
        ListEmptyComponent={<>{empty}</>}
        contentContainerStyle={[styles[insetOf(hasHeader, sticky !== undefined)], contentStyle]}
        onEndReached={onEndReached}
        onEndReachedThreshold={END_THRESHOLD}
        onScroll={(event) => {
          scrollY.set(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={SCROLL_PERIOD}
      />
      {header === undefined ? null : <Animated.View style={[styles.masthead, mastheadStyle]}>{header}</Animated.View>}
      {sticky === undefined ? null : (
        <Animated.View style={[styles[hasHeader ? 'stickyUnderHeader' : 'stickyAtTop'], stickyStyle]}>
          {sticky}
        </Animated.View>
      )}
    </Animated.View>
  );
}
