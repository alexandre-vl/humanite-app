import { Platform } from 'react-native';

/**
 * Whether the platform draws a symbol as a letter rather than as a picture.
 *
 * Android has no symbol set of its own to draw from, so the library loads a Material Symbols font and writes the mark
 * as text — `fontSize` and all. iOS hands the size to a real SF Symbol view, in points.
 */
export const DRAWN_AS_TEXT = Platform.OS === 'android';

/**
 * The size to hand the symbol so the mark lands at the size the paper asked for.
 *
 * A letter follows the reader's step and a mark should not: a mark is the shape of a thing, already drawn at the size
 * the paper wants, and the step is meant for words. Where the mark is a letter the step is therefore undone here, so
 * that what is drawn is what was asked — measured on an A065, where a mark left to follow the step was drawn at twice
 * its box and cut down to an angle at the largest step the phone offers.
 *
 * The step is not undone on the box the mark sits in: a box is not a letter and never grew, so the space a mark takes
 * in a row is the same at every step.
 */
export const symbolSize = (size: number, fontScale: number, drawnAsText: boolean): number =>
  drawnAsText ? size / fontScale : size;
