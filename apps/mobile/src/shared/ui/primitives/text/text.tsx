import type { DisplayText } from '@huma/contracts';
import type { TextTone, TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import type { TextAlign } from '../../../lib/styles';
import { textStyle, useTheme, useTypesetting } from '../../../lib/styles';

export type TextProps = Readonly<{
  children: DisplayText;
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  numberOfLines?: number;
  heading?: boolean;
  /**
   * Whether the line is something that has just happened rather than something that was always on the page.
   *
   * A reader who is listening has their focus where they left it — on the button they pressed — and a line that
   * appears below it is silent to them unless the page says otherwise. This says otherwise: the platform reads it out
   * where it stands, without taking the focus away from what the reader was doing. It is Android's to honour, which
   * is where this app is read; on iOS the role is carried and the reading is not, and nothing written here can change
   * that.
   */
  alert?: boolean;
}>;

/**
 * App text in a named type style. The variant fixes the face, the size and the line height it derives (the size times
 * its multiple); the tone is the theme colour it paints with, the variant's own unless a caller overrides it. Text
 * truncates to numberOfLines when given, and reads a DisplayText, never a raw string. A sentence whose parts differ —
 * a slanted word, a link — is not this: it is RichText, which takes the parts rather than one string.
 *
 * A text cut to a number of lines is broken simply, each line filled before the next begins. Android's default evens out
 * the lines of the whole paragraph, the lines cut away included, and starts a line early to do it: a standfirst cut at
 * three lines showed fewer words than three lines hold, with room left at the end of its first.
 *
 * A cut is for a line that fits, not for one that runs over. Android ends a cut line on an ellipsis it measures in the
 * system's font — React Native gives the view the size of the type but never its face — and draws it in the paper's,
 * and Overpass sets its « … » at 0.9 em where the system's takes about two thirds: the last point falls past the line
 * and is clipped, so a cut standfirst ended « est c.. » on the A065. Nothing written in JavaScript reaches the face the
 * view measures with; the feed's cards stopped cutting their standfirsts rather than live with it.
 *
 * `alert` says the line was not there a moment ago, and a reader listening should hear it without going to look.
 *
 * `heading` says the line opens what follows it, which is how a reader listening to the paper skips through it: a
 * screen reader offers to jump from one heading to the next, and a page with none is a page that can only be walked
 * word by word. It is not read off the variant, because the same type serves a headline and the title of a card in a
 * feed, and only one of those opens anything — the screen that lays them out is what knows which.
 */
export function Text({ children, variant = 'body', tone, align, numberOfLines, heading, alert }: TextProps): ReactNode {
  const theme = useTheme();
  const typesetting = useTypesetting();
  return (
    <NativeText
      numberOfLines={numberOfLines}
      textBreakStrategy={numberOfLines === undefined ? 'highQuality' : 'simple'}
      accessibilityRole={alert === true ? 'alert' : heading === true ? 'header' : undefined}
      accessibilityLiveRegion={alert === true ? 'assertive' : undefined}
      style={textStyle(variant, theme, typesetting, tone, align)}
    >
      {children}
    </NativeText>
  );
}
