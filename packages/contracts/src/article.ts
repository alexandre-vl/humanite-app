import { z } from 'zod';
import { INSTANT } from './clock.ts';
import { SPAN } from './content.ts';
import { DISPLAY_TEXT } from './display-text.ts';
import { ACCESS, ARTICLE_FORMAT } from './enums.ts';
import { ARTICLE_ID } from './ids.ts';
import { PICTURE } from './picture.ts';

/**
 * The illustration of an item: its picture, with the caption and the credit that go under it.
 *
 * The picture comes from either of the two sources a picture has. The caption and the credit are what the journal may
 * leave out: of the 375 items of a capture, 287 carry a caption and 88 none — columns and videos, nearly all. The
 * journal sends no credit of its own; it writes one into the caption, after its last sentence and behind a « © », on
 * 264 of the 287, and a reading sets it apart. A picture without words under it is still a picture.
 */
export const HERO = z.object({
  picture: PICTURE,
  caption: DISPLAY_TEXT.optional(),
  credit: DISPLAY_TEXT.optional(),
});
export type Hero = z.infer<typeof HERO>;
/**
 * The raw shape `HERO` accepts, before it brands and validates it: what a reading builds and hands the schema. Typed,
 * so a key spelt wrong is refused by the compiler rather than dropped by the parse — an object schema strips the keys
 * it does not name, and an optional one missing would read as a picture with nothing under it.
 */
export type HeroInput = z.input<typeof HERO>;

/**
 * A film of the journal: where it plays.
 *
 * The journal puts its films on YouTube and links each video item to its own — 31 of 31 in a capture, in three
 * shapes: `youtu.be/<id>` on 28, `youtube.com/watch?v=<id>` and `youtube.com/shorts/<id>` — with no running time
 * anywhere. The app plays nothing itself: a film opens where it lives, which is what the official app does with it. An
 * address of any other shape is not a film of the journal, and names none.
 */
export const FILM = z.object({
  url: z.url().regex(/^https:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/))[\w-]{11}(?:[?&].*)?$/u),
});

/**
 * An item as a feed shows it: everything but the body.
 *
 * No field carries a length or a count. Measured on 375 items the journal's service answered, a title of fifty to a
 * hundred and forty signs misses sixteen per cent of them, in both directions, and a standfirst of a hundred and fifty
 * to three hundred misses forty-eight per cent, some having none: a bound half the real items break is not a rule, it
 * is a way of losing articles. The corpus, which is written and so can be held to bounds, is held to them where it is
 * written — `packages/mock-content/src/validate.ts`.
 *
 * It holds what the service says of every item, and nothing it says of none. Where an item ran is not here: the
 * service names no section on any item, on any route, so a screen that printed one would print it for the items of a
 * section's own list and for nothing else. Nor is a flag for what the desk picked out: the service sends one on every
 * item, and it was set on none of 514.
 *
 * `byline` is who signed the piece, written out as the journal writes it — one name, or `La rédaction` — with nobody
 * behind it to look up. `standfirst` is absent from an item filed without one, and from an article whose body opens on
 * the words that stood in for it.
 */
export const ARTICLE_SUMMARY = z.object({
  id: ARTICLE_ID,
  format: ARTICLE_FORMAT,
  access: ACCESS,
  title: DISPLAY_TEXT,
  standfirst: DISPLAY_TEXT.optional(),
  byline: DISPLAY_TEXT.optional(),
  publishedAt: INSTANT,
  hero: HERO.optional(),
  film: FILM.optional(),
});
export type ArticleSummary = z.infer<typeof ARTICLE_SUMMARY>;
/** The raw shape `ARTICLE_SUMMARY` accepts, typed for the reason `HeroInput` is. */
export type SummaryInput = z.input<typeof ARTICLE_SUMMARY>;

/**
 * A block of an article body.
 *
 * A picture set inside a body is the same thing as the picture over it — a picture of either source, the words the
 * journal writes under it and the credit it writes into them — and has the same shape, so one figure draws both.
 *
 * A body that sends a reader to another article carries that article's summary, and not only its id. The card it
 * draws needs the title, the standfirst and the picture, and asking for them by id would be a second reading to make
 * after the body — of a batch the journal's service has no route for. What a body points at is written into it when
 * the body is.
 */
export const BLOCK = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), spans: z.array(SPAN) }),
  z.object({ type: z.literal('heading'), text: DISPLAY_TEXT }),
  z.object({ type: z.literal('quote'), spans: z.array(SPAN), source: DISPLAY_TEXT.optional() }),
  z.object({
    type: z.literal('image'),
    picture: PICTURE,
    caption: DISPLAY_TEXT.optional(),
    credit: DISPLAY_TEXT.optional(),
  }),
  z.object({ type: z.literal('related'), summary: ARTICLE_SUMMARY }),
]);
export type Block = z.infer<typeof BLOCK>;
/** The raw shape `BLOCK` accepts as input, before it brands and validates it. */
export type BlockInput = z.input<typeof BLOCK>;

/**
 * What the reader is given of a body: all of it, or none of it, because the source keeps it back.
 *
 * A body kept back is not a failure. The article is there — its title, its standfirst, its picture — and what the
 * source withholds is the body, which it gives only to readers holding a right this one does not. The app honours
 * that: it shows what it was given and says why the rest is not there, and it never reads what came with a body the
 * source said this reader may not have.
 *
 * An open body may be empty. A video the journal publishes carries no prose at all — its whole body, read, is the
 * donation form that closes every article — and a body that required one block would refuse to open the video.
 */
const BODY = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('open'), blocks: z.array(BLOCK) }),
  z.object({ kind: z.literal('withheld') }),
]);

/** An item with what the reader is given of its body, as the reader opens it. */
export const ARTICLE = ARTICLE_SUMMARY.extend({ body: BODY });
export type Article = z.infer<typeof ARTICLE>;

/**
 * The words a block puts on a screen, run together the way a screen draws them: the runs of a sentence one straight
 * after the other, the separate parts of a block that has several with a space between. It is what a judging searches
 * a reading for and what a count of words counts, from the one switch that answers for every kind the union declares —
 * a kind added there stops the build here rather than being read, somewhere, as a block with nothing in it.
 */
export const textOf = (block: Block): string => {
  switch (block.type) {
    case 'paragraph':
      return block.spans.map((span) => span.text).join('');
    case 'quote':
      return [
        block.spans.map((span) => span.text).join(''),
        ...(block.source === undefined ? [] : [block.source]),
      ].join(' ');
    case 'heading':
      return block.text;
    case 'image':
      return [block.caption, block.credit].filter((part) => part !== undefined).join(' ');
    case 'related':
      return [block.summary.title, block.summary.standfirst].filter((part) => part !== undefined).join(' ');
  }
};

/** The blocks of a body the reader was given, and none of one withheld. */
export const blocksOf = (article: Article): readonly Block[] =>
  article.body.kind === 'open' ? article.body.blocks : [];
