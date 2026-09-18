import { z } from 'zod';

/** A kebab-case slug: lowercase words joined by single hyphens. */
const SLUG = /^[a-z]+(?:-[a-z]+)*$/u;

/** How an item is named: a three-letter section code, then a slot. Shared so an image key is built on it, not beside it. */
const ITEM = String.raw`[a-z]{3}-(?:a[1-6]|b[1-3])`;

/** An article or brief id: a three-letter section code, then a slot — `pol-a1`, `mon-b3`. */
export const ARTICLE_ID = z
  .string()
  .regex(new RegExp(`^${ITEM}$`, 'u'))
  .brand('ArticleId');
export type ArticleId = z.infer<typeof ARTICLE_ID>;

/** An image key: the id of the item it illustrates, then what it shows — `pol-a5-hero`, `cul-a2-galerie`. */
export const IMAGE_KEY = z
  .string()
  .regex(new RegExp(`^${ITEM}-[a-z]+(?:-[a-z]+)*$`, 'u'))
  .brand('ImageKey');
export type ImageKey = z.infer<typeof IMAGE_KEY>;

/** A section id, its slug: `culture-et-savoir`. */
export const SECTION_ID = z.string().regex(SLUG).brand('SectionId');
export type SectionId = z.infer<typeof SECTION_ID>;

/** An author id, a kebab-case name: `lucie-varenne`. */
export const AUTHOR_ID = z.string().regex(SLUG).brand('AuthorId');
export type AuthorId = z.infer<typeof AUTHOR_ID>;
