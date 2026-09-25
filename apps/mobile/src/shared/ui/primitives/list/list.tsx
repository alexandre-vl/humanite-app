import { SIZES, SPACING } from '@huma/design-tokens';
import { FlashList } from '@shopify/flash-list';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ScrollViewMarker } from 'react-native-screens/experimental';
import { announcedAs, DECORATIVE } from '../../../lib/announce';
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
  /** What stands under the last item: the next part on its way, or the failure to fetch it. */
  footer?: ReactNode;
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

/**
 * How near the end the scroll gets, in heights of the list's own frame, before it asks for the next page: four.
 *
 * Half a height was the reader's last flick. The next part of the wire took 11.3 seconds to come on the iPhone
 * simulator on 25/09/2026, and asked for with half a screen left, all of it was spent looking at the last item. A page
 * the journal's service has not served lately still takes five to seven seconds to come — 5.3 to 7.2 measured on the
 * wire the same day, one to four sections a step. Four heights ahead, a reader running down the headlines at a height
 * every two seconds meets the next part already there, and one flicking meets the foot saying it is on its way.
 */
const END_THRESHOLD = 4;

/** How often the native scroll reports its offset, in milliseconds: one report per frame at 60 Hz. */
const SCROLL_PERIOD = 16;

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

/**
 * What the list lets the platform add around its content: on iOS, whatever of the screen's bars lies over its frame.
 *
 * From iOS 26 the tab bar floats over the screen instead of standing below it, so a list reaching the foot of the
 * screen runs under it. Measured on the iPhone simulator on 25/09/2026, the last card of the front page ended with
 * its time and its bookmark behind the bar, out of reach. The system knows how much of the frame the bar covers, and
 * lends the list that much at the end — the bar raised or shrunk, a pushed screen with no bar at all but the home
 * indicator, all of it — and moves the scroll indicator out from under the bar with it. Android has no such bar over
 * content and ignores the setting.
 */
const INSETS = 'automatic';

/**
 * The frame the scroll view fills. It is written here and not in the style table because the scroll view has to keep
 * its identity for as long as the list lives: the table is built again whenever the theme changes, and a scroll view
 * built from a new style would be a new scroll view, with the reader's place in the old one thrown away.
 */
const FILL = { flex: 1 } as const;

/**
 * The scroll view under every list, marked as the one the screen's bars follow.
 *
 * A bar that floats over content does three things with one scroll view: it shrinks as the reader goes down it, it
 * blurs what passes under it, and it pads its end. Left to find that scroll view, the screen takes the first one
 * down the chain of first children — on the wire, the band of sections then across its top; on the front page, none.
 * Measured on the iPhone simulator on 25/09/2026, the bar never shrank on either, and headlines ran sharp under its
 * labels. The marker names this one, wherever the list sits in the screen, and does nothing where no bar looks for it.
 *
 * It is a function rather than a component because that is what the list under this one takes. It is written once,
 * here, because the list rebuilds its scroll view whenever it is handed a different one.
 */
const markedScroll = (props: ScrollViewProps): ReactNode => (
  <ScrollViewMarker style={FILL}>
    <ScrollView {...props} />
  </ScrollViewMarker>
);

const useStyles = createStyles(() => ({
  frame: { flex: 1 },
  fill: { flex: 1 },
  flush: { paddingTop: SPACING.none },
  // As tall as what it holds, and never less than the height the tokens give it, which is what one line of a screen's
  // name measures at the phone's default text size.
  masthead: {
    position: 'absolute',
    top: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    minHeight: SIZES.headerExpanded,
  },
}));

/**
 * A virtualised list, under an optional `header` band that fades and slides away as it scrolls. The band lives here
 * rather than in a header primitive of its own because a screen may hold only one scrolling region — two would fight
 * for the gesture and neither would recycle — and because a primitive may not import another primitive, so whoever
 * owns the scroll must also own what reacts to it.
 *
 * What goes in the band is the screen's, and so is its height, which the list measures: it insets its own content by
 * exactly what the band hides, and slides the band away over exactly that distance. The height was the tokens' once,
 * worked out for one line of a screen's name at the reader's largest step; at the phone's largest text size the name
 * stood seventy points tall and ran to two lines, and the band cut it to « Mes lectur » with the bottom of every letter
 * gone (iPhone simulator, 25/09/2026). The tokens' height is still where the band starts, being what it measures at the
 * phone's default size, so a first render lays the content where it stays unless the phone's text is set larger.
 * There was a second band as well, a strip that stayed under the first, of one row or two; no screen laid one, and it
 * went.
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
  footer,
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
  // How tall the band stands, in both places it is needed: on the thread that draws, for the distance it slides away
  // over, and in a render, for the inset of the content under it, which the list under this one must be told of.
  const distance = useSharedValue<number>(SIZES.headerExpanded);
  const [band, setBand] = useState<number>(SIZES.headerExpanded);
  // The inset is the band's measured height, a length no token holds: it is carried the way a measurement is, and
  // not through the style table.
  const underBand = useMemo(() => ({ paddingTop: band }), [band]);
  const mastheadStyle = useAnimatedStyle(() => {
    const progress = collapseProgress(scrollY.get(), distance.get());
    return { opacity: lerp(1, 0, progress), transform: [{ translateY: lerp(0, -distance.get(), progress) }] };
  });
  return (
    <View style={styles.frame}>
      <FlashList
        style={styles.fill}
        data={items}
        keyExtractor={keyOf}
        getItemType={typeOf}
        renderItem={(info) =>
          // The pinned copy of a row is for the eye. The row itself stands in the list, in the order a reader
          // listening walks it, and the copy made it heard twice: at the top of the wire on the iPhone simulator on
          // 25/09/2026, the day was read out once pinned over the rows and once in them.
          info.target === 'StickyHeader' ? (
            <View {...announcedAs(DECORATIVE)}>{renderItem(info.item)}</View>
          ) : (
            <>{renderItem(info.item)}</>
          )
        }
        stickyHeaderIndices={pinnedPlaces}
        ListEmptyComponent={<>{empty}</>}
        ListFooterComponent={<>{footer}</>}
        contentContainerStyle={[header === undefined ? styles.flush : underBand, contentStyle]}
        onEndReached={onEndReached}
        onEndReachedThreshold={END_THRESHOLD}
        onRefresh={onRefresh}
        refreshing={refreshing}
        // Only a band has anything to do with where the list is: a list without one is not told, and is spared a
        // report on the JavaScript thread at every frame of a scroll.
        onScroll={
          header === undefined
            ? undefined
            : (event) => {
                scrollY.set(event.nativeEvent.contentOffset.y);
              }
        }
        scrollEventThrottle={SCROLL_PERIOD}
        maintainVisibleContentPosition={KEEP_PLACE}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderScrollComponent={markedScroll}
        contentInsetAdjustmentBehavior={INSETS}
      />
      {header === undefined ? null : (
        <Animated.View
          style={[styles.masthead, mastheadStyle]}
          onLayout={(event) => {
            const measured = event.nativeEvent.layout.height;
            distance.set(measured);
            setBand(measured);
          }}
        >
          {header}
        </Animated.View>
      )}
    </View>
  );
}
