import { z } from 'zod';
import { BLOCK } from './content.ts';
import { DISPLAY_TEXT } from './display-text.ts';
import { ACCESS, ARTICLE_FORMAT, ARTICLE_KIND } from './enums.ts';
import { ARTICLE_ID, AUTHOR_ID, SECTION_ID } from './ids.ts';

/** The illustration of an item, with its caption and its credit. */
export const HERO = z.object({ caption: DISPLAY_TEXT, credit: DISPLAY_TEXT });
export type Hero = z.infer<typeof HERO>;

/** An item as a feed shows it: everything but the body. */
export const ARTICLE_SUMMARY = z.object({
  id: ARTICLE_ID,
  kind: ARTICLE_KIND,
  section: SECTION_ID,
  format: ARTICLE_FORMAT,
  access: ACCESS,
  title: DISPLAY_TEXT.min(50).max(140),
  standfirst: DISPLAY_TEXT.min(150).max(300),
  authors: z.array(AUTHOR_ID).min(1).max(2),
  publishedAt: z.iso.datetime(),
  tags: z.array(DISPLAY_TEXT).min(2).max(4),
  hero: HERO.optional(),
  emphasis: z.boolean().optional(),
});
export type ArticleSummary = z.infer<typeof ARTICLE_SUMMARY>;

/** An item with its body, as the reader opens it. */
export const ARTICLE = ARTICLE_SUMMARY.extend({ blocks: z.array(BLOCK).min(1) });
export type Article = z.infer<typeof ARTICLE>;
