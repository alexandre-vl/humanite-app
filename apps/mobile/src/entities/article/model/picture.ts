import type { ArticleSummary } from '@huma/contracts';
import { visualOf } from '#api';
import type { Visual, VisualSize } from '#api';

/** The frame a picture is cropped to, which is the shape the corpus draws them in. */
export const HERO_RATIO = 16 / 9;

/**
 * The wider frame a picture fills on a reading screen, measured on capture 13 at 1058 × 493 points. A card crops its
 * picture to the shape the corpus draws it in; an article crops it to the band the sheet gives it, which is not the
 * same shape and is not meant to be.
 */
export const LEAD_RATIO = 1058 / 493;

/**
 * The illustration an item carries at the size asked for, or nothing: a brief and a column are written without one.
 * The corpus holds no brief with a picture today, but nothing in the contracts forbids one — the schema makes `hero`
 * optional on every item, and the corpus rule only stops requiring it of a brief — so the question is asked of the
 * item, never of its kind.
 */
export const pictureOf = (summary: ArticleSummary, size: VisualSize): Visual | null =>
  summary.hero === undefined ? null : visualOf(summary.hero.key, size);

/**
 * The item a run of articles opens on: the first of them that carries a picture, or nothing at all.
 *
 * Both the wire and a page of the paper open on a picture, and both are handed their items newest first — so both
 * ask this, rather than each keeping its own idea of what an opener is. The question is asked of the picture the app
 * can actually draw, not of the key an item names: a key whose file never arrived would open a page on a grey box.
 */
export const openerOf = (summaries: readonly ArticleSummary[]): ArticleSummary | undefined =>
  summaries.find((summary) => pictureOf(summary, 'card') !== null);
