import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

export type PagerProps = Readonly<{
  /** How many pages it holds. */
  count: number;
  /** Which one is showing. */
  active: number;
  /** The page a swipe came to rest on. */
  onActive: (index: number) => void;
  /** What one page holds, asked only of the pages that are mounted. */
  renderPage: (index: number) => ReactNode;
}>;

/**
 * How far either side of the page being read the pager keeps a page mounted.
 *
 * One. A swipe has to find the next page already drawn or it starts on empty ground, and a pager that mounted all
 * nine would hold nine virtualised feeds and nine queries for a reader looking at one. The pages that are not mounted
 * are still laid out, at the width of the screen: the scroll offset is what says which page is showing, so a page
 * left out of the layout would move every page after it.
 */
const NEAR = 1;

/**
 * A row of full-width pages a reader moves through by swiping across them, or by being sent to one.
 *
 * It is a primitive because it owns a native scrolling region, and the axis is what makes it safe beside the
 * vertical list inside each page: a horizontal drag and a vertical one are told apart by the platform, and neither
 * ever reaches the other. What it does not own is the band that names the pages — that is a screen's, and a band
 * carried inside the pager would slide off with the page it was naming.
 *
 * The offset is driven from one side at a time. A press on the band changes `active`, and the effect below scrolls
 * to it; a swipe changes the offset, and `onActive` reports where it came to rest. The last landing is remembered so
 * that reporting a swipe does not scroll to where the reader has already arrived.
 */
export function Pager({ count, active, onActive, renderPage }: PagerProps): ReactNode {
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const landed = useRef(active);
  useEffect(() => {
    if (landed.current === active) {
      return;
    }
    landed.current = active;
    scroll.current?.scrollTo({ x: active * width, animated: true });
  }, [active, width]);
  const pages = Array.from({ length: count }, (unused, index) => index);
  // The width is a measurement of the screen and not a token, so it reaches the view beside the style table rather
  // than inside it — the same way the status bar's inset does.
  const cell = { width };
  return (
    <ScrollView
      ref={scroll}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        landed.current = index;
        onActive(index);
      }}
    >
      {pages.map((index) => (
        <View key={index} style={cell}>
          {Math.abs(index - active) > NEAR ? null : renderPage(index)}
        </View>
      ))}
    </ScrollView>
  );
}
