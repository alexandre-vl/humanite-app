import { Platform } from 'react-native';

/**
 * Whether the platform draws a switch's knob wider than its track, so that it reaches past the track onto the page.
 *
 * Android does, laying the knob across the middle of a narrower pill — measured on an A065. iOS draws the knob inside
 * the track, with track all round it, and it touches nothing else.
 */
export const KNOB_WIDER_THAN_TRACK = Platform.OS === 'android';

/**
 * The role of the theme the knob is painted in.
 *
 * A knob that reaches the page owes the page as much as the track, and the colour the paper writes in is the one far
 * from both pages and both tracks. A knob inside its track owes the track alone, and there it takes the white of every
 * other switch on the phone. Painted in the colour the paper writes in, on the iPhone simulator on 25/09/2026, it lay
 * dark on the dark grey of a switch set off, and the switch read as set on, or as greyed out — every pair above the
 * bar all the same. The white is the one already laid on the red: 5.30 to 1 from the grey, 3.83 from the red.
 */
export const knobRole = (widerThanTrack: boolean): 'textPrimary' | 'onPrimary' =>
  widerThanTrack ? 'textPrimary' : 'onPrimary';
