import type { ArticleSummary } from '@huma/contracts';
import { visualOf } from '#api';
import type { Visual, VisualSize } from '#api';

/** The frame a picture is cropped to, which is the shape the corpus draws them in. */
export const HERO_RATIO = 16 / 9;

/**
 * The illustration an item carries at the size asked for, or nothing: a brief and a column are written without one.
 * The corpus holds no brief with a picture today, but nothing in the contracts forbids one — the schema makes `hero`
 * optional on every item, and the corpus rule only stops requiring it of a brief — so the question is asked of the
 * item, never of its kind.
 */
export const pictureOf = (summary: ArticleSummary, size: VisualSize): Visual | null =>
  summary.hero === undefined ? null : visualOf(summary.hero.key, size);
