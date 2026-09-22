import { z } from 'zod';
import { BLOCK } from './content.ts';
import { DISPLAY_TEXT } from './display-text.ts';
import { ACCESS, ARTICLE_FORMAT } from './enums.ts';
import { ARTICLE_ID, SECTION_ID } from './ids.ts';
import { PICTURE } from './picture.ts';

/**
 * The illustration of an item: its picture, with the caption and the credit that go under it.
 *
 * The picture comes from either of the two sources a picture has. The caption and the credit are what the journal may
 * leave out: of the 519 items of a capture, 353 carry a caption, 111 carry no such field and 55 carry it empty, and
 * none carries a credit, which the journal writes into the caption — « | Source : istock » — when it writes one at
 * all. A picture without words under it is still a picture.
 */
export const HERO = z.object({
  picture: PICTURE,
  caption: DISPLAY_TEXT.optional(),
  credit: DISPLAY_TEXT.optional(),
});
export type Hero = z.infer<typeof HERO>;

/**
 * An item as a feed shows it: everything but the body.
 *
 * No field carries a length or a count. Measured on 375 items the journal's service answered, a title of fifty to a
 * hundred and forty signs misses sixteen per cent of them, in both directions, and a standfirst of a hundred and fifty
 * to three hundred misses forty-eight per cent, some being empty: a bound half the real items break is not a rule, it
 * is a way of losing articles. The corpus, which is written and so can be held to bounds, is held to them where it is
 * written — `packages/mock-content/src/validate.ts`.
 *
 * `section` is where an item ran, when that is known. The service names no section on any item, on any route, and
 * only a section's own list says, by being that section's: a reading that knows gives it, one that does not leaves it
 * out, and a screen shows no section rather than a wrong one.
 *
 * `byline` is who signed the piece, written out as the journal writes it — one name, two joined by a word of its own,
 * or `La rédaction` — with nobody behind it to look up.
 */
export const ARTICLE_SUMMARY = z.object({
  id: ARTICLE_ID,
  section: SECTION_ID.optional(),
  format: ARTICLE_FORMAT,
  access: ACCESS,
  title: DISPLAY_TEXT,
  standfirst: DISPLAY_TEXT,
  byline: DISPLAY_TEXT.optional(),
  publishedAt: z.iso.datetime(),
  hero: HERO.optional(),
  emphasis: z.boolean().optional(),
});
export type ArticleSummary = z.infer<typeof ARTICLE_SUMMARY>;

/**
 * An item with its body, as the reader opens it.
 *
 * The body may be empty. A video the journal publishes carries no prose at all — its whole body, read, is the donation
 * form that closes every article — and a schema that required one block would refuse to open the video.
 */
export const ARTICLE = ARTICLE_SUMMARY.extend({ blocks: z.array(BLOCK) });
export type Article = z.infer<typeof ARTICLE>;
