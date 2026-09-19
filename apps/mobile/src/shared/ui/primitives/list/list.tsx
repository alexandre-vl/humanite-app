import { SIZES, SPACING } from '@huma/design-tokens';
import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { createStyles } from '../../../lib/styles';
import type { StyleRef } from '../../../lib/styles';
import { collapseDistance, collapseProgress, lerp } from './geometry';

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
  contentStyle?: StyleRef;
}>;

/**
 * How many rows the strip that stays takes, each one `SIZES.band` tall. The list draws the strip and insets its own
 * content by exactly its height, so it has to be told: a band is composed by the screen, and what a screen puts in one
 * is not something a list can see.
 */
type BandRows = 1 | 2;

/**
 * Bands the list draws over its own content: a masthead that slides away, a strip that stays under it, and how many
 * rows that strip takes — one unless it says otherwise, which is what a strip of one kind of thing takes.
 */
type WithBands = Readonly<{
  header?: ReactNode;
  sticky?: ReactNode;
  stickyRows?: BandRows | undefined;
  pinned?: undefined;
}>;

/** Items of the data that stay at the top while the run they open scrolls past. */
type WithPinned<Item> = Readonly<{
  header?: undefined;
  sticky?: undefined;
  stickyRows?: undefined;
  pinned: (item: Item) => boolean;
}>;

/**
 * A list either draws bands of its own or pins items of its data, never both: the pinned item is laid at the very top
 * of the list's frame, which is where the bands already are, so the two would stack on the same pixels. The union says
 * so in the type, since nothing at runtime would notice one hiding the other.
 */
export type ListProps<Item> = ListCore<Item> & (WithBands | WithPinned<Item>);

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
  underBand: { paddingTop: SIZES.band },
  underBandPair: { paddingTop: SIZES.bandPair },
  underHeaderBand: { paddingTop: SIZES.headerBand },
  underHeaderBandPair: { paddingTop: SIZES.headerBandPair },
  masthead: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.headerExpanded,
    overflow: 'hidden',
  },
  bandUnderHeader: {
    position: 'absolute',
    top: SIZES.headerExpanded,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.band,
  },
  bandPairUnderHeader: {
    position: 'absolute',
    top: SIZES.headerExpanded,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.bandPair,
  },
  bandAtTop: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.band,
  },
  bandPairAtTop: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    height: SIZES.bandPair,
  },
}));

/**
 * The inset the scrolled content needs, and where the strip that stays is laid, for each arrangement of bands: each
 * band hides its own height at the top. Two tables rather than a chain of conditions, because a style table is built
 * once per theme and cannot add two heights together at the moment it is read.
 */
const INSETS = {
  bare: { none: 'flush', 1: 'underBand', 2: 'underBandPair' },
  header: { none: 'underHeader', 1: 'underHeaderBand', 2: 'underHeaderBandPair' },
} as const;

const BANDS = {
  bare: { 1: 'bandAtTop', 2: 'bandPairAtTop' },
  header: { 1: 'bandUnderHeader', 2: 'bandPairUnderHeader' },
} as const;

/**
 * A virtualised list, under an optional `header` band that fades and slides away as it scrolls and an optional `sticky`
 * band that stays pinned, of `stickyRows` rows. The bands live here rather than in a header primitive of their own
 * because a screen may hold only one scrolling region — two would fight for the gesture and neither would recycle —
 * and because a primitive may not import another primitive, so whoever owns the scroll must also own what reacts to it.
 *
 * What goes in a band is the screen's, its height is not: the list insets its own content by exactly what the bands
 * hide, and a band it measured for itself would be a band it had to render before it could lay anything out.
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
 */
export function List<Item>({
  items,
  keyOf,
  typeOf,
  renderItem,
  pinned,
  empty,
  header,
  sticky,
  stickyRows = 1,
  onEndReached,
  contentStyle,
}: ListProps<Item>): ReactNode {
  const styles = useStyles();
  const pinnedPlaces = useMemo(
    () => (pinned === undefined ? undefined : items.flatMap((item, index) => (pinned(item) ? [index] : []))),
    [items, pinned],
  );
  const scrollY = useSharedValue(0);
  const hasHeader = header !== undefined;
  const above = hasHeader ? 'header' : 'bare';
  // The inset is read off the band actually handed over, never off the row count alone: a count given without a band
  // would otherwise push the content down under nothing at all.
  const rows = sticky === undefined ? 'none' : stickyRows;
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
        stickyHeaderIndices={pinnedPlaces}
        ListEmptyComponent={<>{empty}</>}
        contentContainerStyle={[styles[INSETS[above][rows]], contentStyle]}
        onEndReached={onEndReached}
        onEndReachedThreshold={END_THRESHOLD}
        onScroll={(event) => {
          scrollY.set(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={SCROLL_PERIOD}
      />
      {header === undefined ? null : <Animated.View style={[styles.masthead, mastheadStyle]}>{header}</Animated.View>}
      {sticky === undefined ? null : (
        <Animated.View style={[styles[BANDS[above][stickyRows]], stickyStyle]}>{sticky}</Animated.View>
      )}
    </Animated.View>
  );
}
