import { SIZES, SPACING } from '@huma/design-tokens';
import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';
import { collapseProgress, lerp } from './geometry';

/** What every list needs, whichever way it holds something still at the top. */
type ListCore<Item> = Readonly<{
  items: readonly Item[];
  keyOf: (item: Item) => string;
  typeOf: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  empty?: ReactNode;
  // Spelt with `undefined` because it is forwarded: a feed read in one call has no next page to ask for, and under
  // `exactOptionalPropertyTypes` handing that absence over is not the same as leaving the prop out.
  onEndReached?: (() => void) | undefined;
  /**
   * What a pull down the top of the list asks for, and whether that asking is under way. The pair is the platform's:
   * the list hands both to the view under it, which draws the system's own spinner and holds it up until `refreshing`
   * turns back. A list given neither shows no spinner and answers no pull.
   */
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
  contentStyle?: StyleRef;
}>;

/** A masthead the list draws over its own content, which slides away as the list scrolls. */
type WithHeader = Readonly<{ header?: ReactNode; pinned?: undefined }>;

/** Items of the data that stay at the top while the run they open scrolls past. */
type WithPinned<Item> = Readonly<{ header?: undefined; pinned: (item: Item) => boolean }>;

/**
 * A list either draws a masthead of its own or pins items of its data, never both: the pinned item is laid at the very
 * top of the list's frame, which is where the masthead already is, so the two would stack on the same pixels. The union
 * says so in the type, since nothing at runtime would notice one hiding the other.
 */
export type ListProps<Item> = ListCore<Item> & (WithHeader | WithPinned<Item>);

/** How near the end the scroll gets, as a share of the visible height, before the list asks for the next page. */
const END_THRESHOLD = 0.5;

/** How often the native scroll reports its offset, in milliseconds: one report per frame at 60 Hz. */
const SCROLL_PERIOD = 16;

/** How far the list scrolls while its masthead goes: the whole of the masthead's height, which it gives back. */
const DISTANCE: number = SIZES.headerExpanded;

/**
 * What the list does when items arrive above the one a reader is looking at: it keeps that one where it was, unless the
 * reader is at the very top, who is taken to the new top instead.
 *
 * Holding the item in view still is the default of the list under this one, and it is the rule of a conversation, where
 * what arrives above is older. A paper is the other way round — what arrives at the top of a page is the news — and on
 * the A065 a front pulled down to be read again kept its old first card at the top of the screen, the three that had
 * just come in hidden above it with nothing to say they were there. A reader who has scrolled still keeps their place.
 *
 * The distance is zero, which is also the one length that cannot be misread: Android compares it with the offset in
 * pixels, where every other length in this file is in points.
 */
const KEEP_PLACE = { autoscrollToTopThreshold: 0 } as const;

const useStyles = createStyles(() => ({
  frame: { flex: 1 },
  fill: { flex: 1 },
  flush: { paddingTop: SPACING.none },
  underHeader: { paddingTop: SIZES.headerExpanded },
  masthead: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.headerExpanded,
    overflow: 'hidden',
  },
}));

/**
 * A virtualised list, under an optional `header` band that fades and slides away as it scrolls. The band lives here
 * rather than in a header primitive of its own because a screen may hold only one scrolling region — two would fight
 * for the gesture and neither would recycle — and because a primitive may not import another primitive, so whoever
 * owns the scroll must also own what reacts to it.
 *
 * What goes in the band is the screen's, its height is not: the list insets its own content by exactly what the band
 * hides, and a band it measured for itself would be a band it had to render before it could lay anything out. There was
 * a second band as well, a strip that stayed under the first, of one row or two; no screen laid one, and it went.
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
 *
 * `pinned` answers, of each item, whether it stays at the top while what follows it scrolls past. The list works out
 * the places itself rather than taking them: places handed in could name a row the data no longer holds, and the list
 * underneath would then quietly stop pinning anything at all, with nothing said. Places read off the data it is
 * rendering cannot say that. A `pinned` that keeps its identity between renders keeps the work down to the renders
 * that change the data.
 *
 * An item answers the first touch even while a keyboard is up. A scroll view otherwise spends that touch putting the
 * keyboard away and hands the item nothing: on the A065, a search answer pressed straight after typing only closed the
 * keyboard, and it took a second press to open it. Dragging the list is what puts the keyboard away now — the moment a
 * reader stops typing to read what came back.
 */
export function List<Item>({
  items,
  keyOf,
  typeOf,
  renderItem,
  pinned,
  empty,
  header,
  onEndReached,
  onRefresh,
  refreshing,
  contentStyle,
}: ListProps<Item>): ReactNode {
  const styles = useStyles();
  const pinnedPlaces = useMemo(
    () => (pinned === undefined ? undefined : items.flatMap((item, index) => (pinned(item) ? [index] : []))),
    [items, pinned],
  );
  const scrollY = useSharedValue(0);
  const mastheadStyle = useAnimatedStyle(() => {
    const progress = collapseProgress(scrollY.get(), DISTANCE);
    return { opacity: lerp(1, 0, progress), transform: [{ translateY: lerp(0, -DISTANCE, progress) }] };
  });
  return (
    <Animated.View style={styles.frame}>
      <FlashList
        style={styles.fill}
        data={items}
        keyExtractor={keyOf}
        getItemType={typeOf}
        renderItem={(info) => <>{renderItem(info.item)}</>}
        stickyHeaderIndices={pinnedPlaces}
        ListEmptyComponent={<>{empty}</>}
        contentContainerStyle={[header === undefined ? styles.flush : styles.underHeader, contentStyle]}
        onEndReached={onEndReached}
        onEndReachedThreshold={END_THRESHOLD}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onScroll={(event) => {
          scrollY.set(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={SCROLL_PERIOD}
        maintainVisibleContentPosition={KEEP_PLACE}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      {header === undefined ? null : <Animated.View style={[styles.masthead, mastheadStyle]}>{header}</Animated.View>}
    </Animated.View>
  );
}
