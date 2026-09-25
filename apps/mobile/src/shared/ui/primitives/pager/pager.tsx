import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { StyleRef } from '../../../lib/styles';
import { createStyles } from '../../../lib/styles';
import { offsetOf, spanAt, travelOf } from './geometry';
import type { NamePlace } from './geometry';

export type PagerProps = Readonly<{
  /** How many pages it holds. */
  count: number;
  /** Which one is showing. */
  active: number;
  /** The page a swipe came to rest on. */
  onActive: (index: number) => void;
  /** What one page holds, asked only of the pages that are built. */
  renderPage: (index: number) => ReactNode;
  /**
   * What the pages are called, drawn in a row across the top: whatever the caller draws a name as.
   *
   * The pager lays them and travels a rule under the one in force; it does not draw them. A name is a word set in the
   * paper's own letters and a target a reader presses, and both of those are a component's.
   */
  names?: ReactNode;
  /**
   * Where each name came to rest, in the order they are drawn, and nothing until the row has laid itself out.
   *
   * The pager cannot work them out: what a name measures depends on its word, on the face it is set in and on the
   * step the reader asked for, none of which is known before the row is laid. Whoever draws the names reads their
   * frames back and hands them here.
   */
  places?: readonly NamePlace[];
  /** The ground the row of names is laid on, and whatever else belongs to the band rather than to a name. */
  namesStyle?: StyleRef;
}>;

/**
 * How far either side of the page being read a page is built.
 *
 * One. A swipe has to find the next page already drawn or it starts on empty ground, and a pager that built every page
 * at once would hold a virtualised feed and a query per section for a reader looking at one. The pages not built are
 * still laid out, at the width of the screen: the scroll offset is what says which page is showing, so a page left out
 * of the layout would move every page after it.
 */
const NEAR = 1;

/**
 * How long the native scroll waits between two reports of its offset, in milliseconds: no time at all, which is to
 * say one report per frame.
 *
 * The band above is drawn from these and from nothing else, so a report held back is a frame the band does not move.
 * The usual sixteen is one report per frame at 60 Hz, and the phone this was measured on draws at 90. Nothing is
 * spent on the extra reports: the handler is a worklet and reads them on the thread that is already drawing.
 */
const SCROLL_PERIOD = 1;

/** How much of the band is kept ahead of the name in force, so it reads as one of a row and not as its end. */
const BEFORE: number = SPACING.xxxl;

/**
 * The width the rule is laid out at, before it is stretched to the width of the name it stands under.
 *
 * It is stretched and not resized, and that is the whole reason this length exists. A width read off a shared value
 * is a layout property, and a layout property that changes puts Yoga through the whole band on every frame: measured
 * on the A065 on 25/09/2026, a rule that widened itself that way turned a turn of 90 frames into one of 20, the
 * screen holding each picture for 45 ms. A transform touches no layout at all.
 */
const LAID: number = SIZES.stroke;

/** The pages within reach of the one being read, which is what a pager builds. */
const reach = (active: number, count: number): readonly number[] =>
  Array.from({ length: count }, (unused, index) => index).filter((index) => Math.abs(index - active) <= NEAR);

const useStyles = createStyles((theme) => ({
  // The band takes no height of its own and no share of what is going: what it measures is what its names measure,
  // which is what has to grow when the reader asks for larger type. The pages take the rest.
  band: { flexGrow: 0, flexShrink: 0 },
  // No padding. The rule is laid absolutely, which Yoga places against the row's padding edge, while a name reports
  // its own place against the row's border edge: a padded row would set the two a padding apart, and the rule would
  // sit that far to the right of the word it names. The inset a band wants is the names' own to carry.
  row: { alignItems: 'flex-end' },
  rule: {
    position: 'absolute',
    bottom: SPACING.none,
    left: SPACING.none,
    width: SIZES.stroke,
    height: SPACING.xs,
    backgroundColor: theme.primary,
  },
  pages: { flex: 1 },
}));

/**
 * A row of full-width pages a reader moves through by swiping across them, under a band naming them, with a rule
 * travelling under the name of the one in hand.
 *
 * The band is here and not beside because everything about it moves with the pages, and moves on the UI thread. One
 * shared value is written from the scroll of the pages and read by the rule and by the band's own offset: a reader
 * turning a page sees the rule slide from one name to the next, taking the next name's width as it goes, and the
 * band bring the name ahead into view — all at the speed of the finger, with no render in between. The band is laid
 * above the row rather than inside it, which is the thing that must not change: carried inside, it would slide off
 * with the page it was naming.
 *
 * It was two animations chasing one page, and neither was the page. The band learnt which name was in force only
 * once the turn had come to rest, then scrolled itself there over a few hundred milliseconds of its own; for the
 * whole of a turn it named the page the reader had just left. Measured on the A065 on 25/09/2026, the render that
 * told it was part of a 117 ms freeze on every single turn.
 *
 * A page is built once a reader comes within reach of it, and is then kept. Building one is the most expensive thing
 * this does — a feed, a query and a virtualised list — and it used to be done on every turn, because the page
 * falling out of reach behind the reader was taken down at the same moment: 70 ms of the freeze above was that
 * build, against 25 for a turn back to a page still standing. Kept, a section is paid for the first time it is
 * reached and never again — and the reader who turns away and comes back finds it where they left it, which is the
 * other thing taking it down was costing them. A reader who visits three sections holds three feeds; the pages they
 * never went near were never built.
 *
 * The offset is driven from one side at a time. A press on a name changes `active`, and the effect below scrolls to
 * it; a swipe changes the offset, and `onActive` reports where it came to rest. The last landing is remembered so
 * that reporting a swipe does not scroll to where the reader has already arrived.
 */
export function Pager({ count, active, onActive, renderPage, names, places, namesStyle }: PagerProps): ReactNode {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const row = useRef<ScrollView>(null);
  const band = useAnimatedRef<Animated.ScrollView>();
  const landed = useRef(active);
  // Where the turn has got to, counted in pages: a whole number is one page at rest, anything between two is a turn
  // under way. Written by the scroll below and read by the band, both on the thread that draws.
  const turning = useSharedValue(active);
  const [built, setBuilt] = useState<ReadonlySet<number>>(() => new Set(reach(active, count)));
  const wanted = reach(active, count);
  // Adjusted while rendering rather than in an effect, which is what React asks of state that follows a prop: the
  // set only ever grows, so the render that widens it draws the same thing as the one that follows.
  if (!wanted.every((index) => built.has(index))) {
    setBuilt(new Set([...built, ...wanted]));
  }
  useEffect(() => {
    if (landed.current === active) {
      return;
    }
    landed.current = active;
    row.current?.scrollTo({ x: active * width, animated: true });
  }, [active, width]);
  const onScroll = useAnimatedScrollHandler((event) => {
    turning.set(width === 0 ? 0 : event.contentOffset.x / width);
  });
  // Not animated: the offset is already travelling, because what writes it is a finger. An animation on top of it
  // would be a second one aiming at a target the first keeps moving.
  useAnimatedReaction(
    () => offsetOf(spanAt(places ?? [], turning.get()), BEFORE),
    (offset) => {
      scrollTo(band, offset, 0, false);
    },
  );
  // Stretched about its own middle and carried there, never resized: a transform is the one thing a view can be given
  // every frame without anything being laid out again.
  const travel = useAnimatedStyle(() => {
    const { translateX, scaleX } = travelOf(spanAt(places ?? [], turning.get()), LAID);
    return { transform: [{ translateX }, { scaleX }] };
  });
  const pages = Array.from({ length: count }, (unused, index) => index);
  // The width is a measurement of the screen and not a token, so it reaches the view beside the style table rather
  // than inside it — the same way the status bar's inset does.
  const cell = { width };
  return (
    <>
      {names === undefined ? null : (
        <Animated.ScrollView
          ref={band}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.band, namesStyle]}
          contentContainerStyle={styles.row}
        >
          {names}
          <Animated.View style={[styles.rule, travel]} />
        </Animated.ScrollView>
      )}
      <View style={styles.pages}>
        <Animated.ScrollView
          ref={row}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={SCROLL_PERIOD}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            landed.current = index;
            onActive(index);
          }}
        >
          {pages.map((index) => (
            <View key={index} style={cell}>
              {built.has(index) ? renderPage(index) : null}
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </>
  );
}
