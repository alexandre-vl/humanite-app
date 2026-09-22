import { z } from 'zod';
import { BLOCK } from './content.ts';
import { DISPLAY_TEXT } from './display-text.ts';
import { ACCESS, ARTICLE_FORMAT } from './enums.ts';
import { ARTICLE_ID, IMAGE_KEY, SECTION_ID } from './ids.ts';

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
 *
 * Two fields went the other way and are gone. `kind` said whether an item was an article or a brief: no screen ever
 * asked — a feed calls an item short when it comes without a picture — and the service draws no such line, so the one
 * place that needs it, the corpus, reads it off the item's own id. `tags` said what an item was about: no screen ever
 * showed one, and of the sixteen fields the service sends, none is a subject. A field a schema requires and nothing
 * can fill is a field every reading has to invent.
 *
 * `byline` is who signed the piece, written out. It was a list of identifiers into a roster of the newsroom, which
 * the service has no equivalent of: it sends a name and nothing behind it — one name, never two, and `La rédaction`
 * more often than anyone — so there is nobody to look up and no page to send a reader to. A name that resolves to
 * itself is a join that costs a request and answers nothing, and it left with the roster.
 */
export const ARTICLE_SUMMARY = z.object({
  id: ARTICLE_ID,
  section: SECTION_ID,
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

/** An item with its body, as the reader opens it. */
export const ARTICLE = ARTICLE_SUMMARY.extend({ blocks: z.array(BLOCK).min(1) });
export type Article = z.infer<typeof ARTICLE>;
