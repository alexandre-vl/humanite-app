import { z } from 'zod';

/**
 * What the journal's own service sends, written as it arrives and not as we would have liked it.
 *
 * These are wire shapes, not domain types: the keys are the service's, snake_case and French where it writes French,
 * and nothing here is branded. A reading turns one of these into the domain types the app knows, and that reading is
 * the only place the two vocabularies meet. Modelling the wire separately is what lets the service change without a
 * screen changing: a field that moves is caught here, by a parse that fails at a named place.
 *
 * Every shape below was measured on the 519 items of a capture of the official app (2026-09-21), never guessed.
 */

/**
 * An id the service writes as a string in a feed and as a number on its front page — the same item, both ways.
 * Read as a string, because that is what every route that takes one expects back.
 */
const REMOTE_ID = z.union([z.string(), z.number()]).transform((value) => String(value));

/**
 * The four shapes the service gives an item. A fifth would be news, and a parse that names it is how we would hear
 * about it — so this stays closed rather than falling back to the most common one.
 */
const REMOTE_FORMAT = z.enum(['classic', 'opinion', 'video', 'serie']);
export type RemoteFormat = z.infer<typeof REMOTE_FORMAT>;

/**
 * An item as any list of the service carries it.
 *
 * Four fields are absent from the front-page route and present everywhere else, so they are optional here rather than
 * in a second shape: `article_format`, `has_audio`, and — as null — `author` and `image_caption`.
 *
 * `highlighted` is sent on every item and was null on all 519 of them. It is modelled all the same, because it is the
 * one thing the service could say about an item that the wire marks on screen — the filled bead of « En continu » —
 * and a flag the journal starts setting tomorrow should light up, not be stripped by a schema that decided today it
 * would always be empty. Anything but a flag there stops the item, and the reading names it.
 */
export const REMOTE_POST = z.object({
  id: REMOTE_ID,
  type: z.string(),
  date: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  excerpt: z.string(),
  image: z.string(),
  image_caption: z.string().nullish(),
  author: z.string().nullish(),
  article_format: REMOTE_FORMAT.optional(),
  has_audio: z.boolean().optional(),
  premium: z.boolean(),
  right: z.boolean(),
  video_cover: z.number().optional(),
  video_url: z.string().optional(),
  highlighted: z.boolean().nullish(),
});
export type RemotePost = z.infer<typeof REMOTE_POST>;

/**
 * An item with its body. The body is an array the service has only ever filled with one string: the whole article as
 * WordPress rendered it, scripts and donation form included. Splitting it is the reading's work, not the wire's.
 */
export const REMOTE_ARTICLE = REMOTE_POST.extend({ content_array: z.array(z.string()) });
export type RemoteArticle = z.infer<typeof REMOTE_ARTICLE>;

/** What the front page, the wire and a section's own list all answer. */
export const REMOTE_FEED = z.object({ posts: z.array(REMOTE_POST) });
export type RemoteFeed = z.infer<typeof REMOTE_FEED>;

/** What a search answers: the same items, behind a flag the service sets and we have only seen true. */
export const REMOTE_SEARCH = z.object({ success: z.boolean(), posts: z.array(REMOTE_POST) });

/**
 * A section of the paper. `count` is a ceiling the service repeats for every section, not a number of items — a
 * section's own list answers thirty on its first page — so nothing reads it.
 */
const REMOTE_SECTION = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  link: z.string(),
  description: z.string(),
});

/**
 * The key the service names its list of sections with. Written as a string and read through it, so the wire keeps its
 * own language and the glossary keeps ours: no identifier of this repo is ever spelled in French.
 *
 * Exported so the answers a capture records write the key through this same constant rather than a copy of it: the
 * tool that writes them and the module they are written into each declared their own, and it was four spellings.
 */
export const SECTIONS_KEY = 'rubriques';

/** The list of sections, renamed on the way in so nothing downstream reads the service's word for it. */
export const REMOTE_SECTIONS = z
  .object({ [SECTIONS_KEY]: z.array(REMOTE_SECTION) })
  .transform((body) => ({ sections: body[SECTIONS_KEY] }));
export type RemoteSections = z.infer<typeof REMOTE_SECTIONS>;
