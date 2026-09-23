import { z } from 'zod';

/** How an item is named: a three-letter section code, then a slot. Shared so an image key is built on it, not beside it. */
const ITEM = String.raw`[a-z]{3}-(?:a[1-6]|b[1-3])`;

/**
 * How the journal's own service names an item: the number its newsroom system gave it — `3861029`. Exported as the
 * pattern it is, so the address of an article is matched on the grammar its id is parsed with.
 */
export const FILED_PATTERN = String.raw`\d+`;

/**
 * An article or brief id, in either of the two grammars the app reads: a slot of the corpus — `pol-a1`, `mon-b3` — or
 * the number the journal filed the item under.
 *
 * The two are written out rather than loosened into one pattern that would accept both and much else besides. They
 * are disjoint, so an id says which source it came from, and a typo in either still stops at the parse.
 */
export const ARTICLE_ID = z
  .string()
  .regex(new RegExp(`^(?:${ITEM}|${FILED_PATTERN})$`, 'u'))
  .brand('ArticleId');
export type ArticleId = z.infer<typeof ARTICLE_ID>;

/**
 * An article id the journal's service filed: the only grammar its routes take. A client narrows an `ArticleId` through
 * this before it builds an address, so an id of the corpus never reaches the service as a path — and the grammar is
 * the one `ARTICLE_ID` is built on, written once for both.
 */
export const FILED_ID = z
  .string()
  .regex(new RegExp(`^${FILED_PATTERN}$`, 'u'))
  .brand('FiledId');
export type FiledId = z.infer<typeof FILED_ID>;

/**
 * The number the journal's service files a section's list under — `8` for Politique — as its menu gives it. The domain
 * never holds it: a section is its slug, and only the address of the section's list needs the number, which is why it
 * is a brand the menu's own schema mints, and not a number any count could be passed off as.
 */
export const SECTION_NUMBER = z.number().int().positive().brand('SectionNumber');
export type SectionNumber = z.infer<typeof SECTION_NUMBER>;

/** An image key: the id of the item it illustrates, then what it shows — `pol-a5-hero`, `cul-a2-galerie`. */
export const IMAGE_KEY = z
  .string()
  .regex(new RegExp(`^${ITEM}-[a-z]+(?:-[a-z]+)*$`, 'u'))
  .brand('ImageKey');
export type ImageKey = z.infer<typeof IMAGE_KEY>;

/**
 * An issue id: the calendar day the paper carries that day's date, on the newsroom's clock — `2026-09-13`.
 *
 * A numéro of a daily paper is a day, so the day is its name. Written widest first, it sorts as a string in the order
 * it reads, and it is the same key a wire groups its runs under: one instant belongs to exactly one issue.
 */
export const ISSUE_ID = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .brand('IssueId');
export type IssueId = z.infer<typeof ISSUE_ID>;

/** A section id, its slug — `culture-et-savoir`: lowercase words joined by single hyphens. */
export const SECTION_ID = z
  .string()
  .regex(/^[a-z]+(?:-[a-z]+)*$/u)
  .brand('SectionId');
export type SectionId = z.infer<typeof SECTION_ID>;
