import { z } from 'zod';

/** An article or brief id: a three-letter section code, then a slot — `pol-a1`, `mon-b3`. */
export const ARTICLE_ID = z
  .string()
  .regex(/^[a-z]{3}-(?:a[1-6]|b[1-3])$/u)
  .brand('ArticleId');
export type ArticleId = z.infer<typeof ARTICLE_ID>;

/** A section id, its slug: `culture-et-savoir`. */
export const SECTION_ID = z
  .string()
  .regex(/^[a-z]+(?:-[a-z]+)*$/u)
  .brand('SectionId');
export type SectionId = z.infer<typeof SECTION_ID>;

/** An author id, a kebab-case name: `lucie-varenne`. */
export const AUTHOR_ID = z
  .string()
  .regex(/^[a-z]+(?:-[a-z]+)*$/u)
  .brand('AuthorId');
export type AuthorId = z.infer<typeof AUTHOR_ID>;
