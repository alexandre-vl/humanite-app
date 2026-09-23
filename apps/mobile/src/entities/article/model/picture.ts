import type { ArticleSummary } from '@huma/contracts';
import { pictureOf } from '#api';

/**
 * The frames a picture is cropped to, named by what the picture is.
 *
 * A photograph of the journal is three by two: the median of 319 pictures of a capture, and 58 % of them within a
 * hair of it. The frame they were cut to was sixteen by nine on a card — the shape the corpus draws its pictures in,
 * which cut a sixth of every photograph — and two and a sixth on an article, measured off the current app, which cut
 * nearly a third. A video's picture is the still of its film, and its film is sixteen by nine: 29 of the 29 of the
 * capture measure it exactly, so that frame costs a still nothing.
 */
export const FRAMES = { photo: 3 / 2, film: 16 / 9 } as const;

/** The frame a picture is cropped to. */
export type Frame = keyof typeof FRAMES;

/**
 * The item a run of articles opens on: the first of them that carries a picture, or nothing at all.
 *
 * Both the wire and a page of the paper open on a picture, and both are handed their items newest first — so both
 * ask this, rather than each keeping its own idea of what an opener is. The question is asked of the picture the app
 * can actually draw, not of the key an item names: a key whose file never arrived would open a page on a grey box.
 */
export const openerOf = (summaries: readonly ArticleSummary[]): ArticleSummary | undefined =>
  summaries.find((summary) => pictureOf(summary, 'card') !== null);
