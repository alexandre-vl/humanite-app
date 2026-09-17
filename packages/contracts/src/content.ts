import { z } from 'zod';
import { ARTICLE_ID, AUTHOR_ID, SECTION_ID } from './ids.ts';

/** Where a link points: another item of the corpus, or an external page. */
const LINK_TARGET = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('article'), id: ARTICLE_ID }),
  z.object({ kind: z.literal('external'), url: z.url() }),
]);

/** An inline run of text inside a paragraph or a quote. */
export const SPAN = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({ type: z.literal('emphasis'), value: z.string() }),
  z.object({ type: z.literal('strong'), value: z.string() }),
  z.object({ type: z.literal('link'), text: z.string(), target: LINK_TARGET }),
]);
export type Span = z.infer<typeof SPAN>;

/** A block of an article body. */
export const BLOCK = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), spans: z.array(SPAN) }),
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({ type: z.literal('quote'), spans: z.array(SPAN), source: z.string().optional() }),
  z.object({ type: z.literal('image'), caption: z.string(), key: z.string() }),
  z.object({ type: z.literal('video'), title: z.string(), duration: z.string() }),
  z.object({ type: z.literal('related'), id: ARTICLE_ID }),
  z.object({ type: z.literal('callout'), title: z.string(), text: z.string(), button: z.string() }),
]);
export type Block = z.infer<typeof BLOCK>;

/** A section of the newspaper: its id, three-letter code, label and order in the bar. */
export const SECTION = z.object({
  id: SECTION_ID,
  code: z.string().regex(/^[a-z]{3}$/u),
  label: z.string(),
  order: z.number().int().positive(),
});
export type Section = z.infer<typeof SECTION>;

/** A member of the newsroom. */
export const AUTHOR = z.object({
  id: AUTHOR_ID,
  name: z.string(),
  section: SECTION_ID,
  isColumnist: z.boolean(),
});
export type Author = z.infer<typeof AUTHOR>;
