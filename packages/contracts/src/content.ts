import { z } from 'zod';
import { DISPLAY_TEXT } from './display-text.ts';
import { ARTICLE_ID, AUTHOR_ID, SECTION_ID } from './ids.ts';

/** Where a link points: another item of the corpus, or an external page. */
const LINK_TARGET = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('article'), id: ARTICLE_ID }),
  z.object({ kind: z.literal('external'), url: z.url() }),
]);

/** An inline run of text inside a paragraph or a quote. */
export const SPAN = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: DISPLAY_TEXT }),
  z.object({ type: z.literal('emphasis'), value: DISPLAY_TEXT }),
  z.object({ type: z.literal('strong'), value: DISPLAY_TEXT }),
  z.object({ type: z.literal('link'), text: DISPLAY_TEXT, target: LINK_TARGET }),
]);
export type Span = z.infer<typeof SPAN>;
/** The raw shape `SPAN` accepts as input, before it validates it. */
export type SpanInput = z.input<typeof SPAN>;

/** A block of an article body. */
export const BLOCK = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), spans: z.array(SPAN) }),
  z.object({ type: z.literal('heading'), text: DISPLAY_TEXT }),
  z.object({ type: z.literal('quote'), spans: z.array(SPAN), source: DISPLAY_TEXT.optional() }),
  z.object({ type: z.literal('image'), caption: DISPLAY_TEXT, key: z.string() }),
  z.object({ type: z.literal('video'), title: DISPLAY_TEXT, durationSeconds: z.number().int().positive() }),
  z.object({ type: z.literal('related'), id: ARTICLE_ID }),
  z.object({ type: z.literal('callout'), title: DISPLAY_TEXT, text: DISPLAY_TEXT, button: DISPLAY_TEXT }),
]);
export type Block = z.infer<typeof BLOCK>;
/** The raw shape `BLOCK` accepts as input, before it brands and validates it. */
export type BlockInput = z.input<typeof BLOCK>;

/** A section of the newspaper: its id, three-letter code, label and order in the bar. */
export const SECTION = z.object({
  id: SECTION_ID,
  code: z.string().regex(/^[a-z]{3}$/u),
  label: DISPLAY_TEXT,
  order: z.number().int().positive(),
});
export type Section = z.infer<typeof SECTION>;

/** A member of the newsroom. */
export const AUTHOR = z.object({
  id: AUTHOR_ID,
  name: DISPLAY_TEXT,
  section: SECTION_ID,
  isColumnist: z.boolean(),
});
export type Author = z.infer<typeof AUTHOR>;
