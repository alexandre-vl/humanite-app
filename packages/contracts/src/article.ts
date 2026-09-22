import { z } from 'zod';
import { BLOCK } from './content.ts';
import { DISPLAY_TEXT } from './display-text.ts';
import { ACCESS, ARTICLE_FORMAT, ARTICLE_KIND } from './enums.ts';
import { ARTICLE_ID, AUTHOR_ID, IMAGE_KEY, SECTION_ID } from './ids.ts';

/** The illustration of an item: the key that names its picture, with the caption and the credit that go under it. */
export const HERO = z.object({ key: IMAGE_KEY, caption: DISPLAY_TEXT, credit: DISPLAY_TEXT });
export type Hero = z.infer<typeof HERO>;

/**
 * An item as a feed shows it: everything but the body.
 *
 * Four fields carried a length or a count until this schema had to describe the journal's own service as well as the
 * corpus. Measured on 375 items the service answered: a title of fifty to a hundred and forty signs misses sixteen
 * per cent of them, in both directions, and the shortest is « Climat » at six; a standfirst of a hundred and fifty to
 * three hundred misses forty-eight per cent, and some are empty; the service names exactly one author, never two, and
 * it names no tag at all. A bound that half the real items break is not a rule, it is a way of losing articles.
 *
 * The bounds were not dropped, they moved to where they are true: `packages/mock-content/src/validate.ts` holds them
 * against the corpus, which is written and so can be held to them.
 */
export const ARTICLE_SUMMARY = z.object({
  id: ARTICLE_ID,
  kind: ARTICLE_KIND,
  section: SECTION_ID,
  format: ARTICLE_FORMAT,
  access: ACCESS,
  title: DISPLAY_TEXT,
  standfirst: DISPLAY_TEXT,
  authors: z.array(AUTHOR_ID),
  publishedAt: z.iso.datetime(),
  tags: z.array(DISPLAY_TEXT),
  hero: HERO.optional(),
  emphasis: z.boolean().optional(),
});
export type ArticleSummary = z.infer<typeof ARTICLE_SUMMARY>;

/** An item with its body, as the reader opens it. */
export const ARTICLE = ARTICLE_SUMMARY.extend({ blocks: z.array(BLOCK).min(1) });
export type Article = z.infer<typeof ARTICLE>;
