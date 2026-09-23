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
 * The shapes the service gives an item. The list stays closed rather than falling back to the most common one: a new
 * shape is news, and a parse that names it is how it is heard of. That is how `live` was — the journal's running
 * coverage of an event, absent from the 519 items of the first capture and set aside, by name, on the phone's wire
 * on 23/09/2026.
 */
const REMOTE_FORMAT = z.enum(['classic', 'opinion', 'video', 'serie', 'live']);
export type RemoteFormat = z.infer<typeof REMOTE_FORMAT>;

/**
 * An item as any list of the service carries it.
 *
 * It holds the keys a reading reads, and no other. The service sends more — a slug, a type that is always `post`, an
 * audio flag never once set, a number for a video's cover that no route resolves, a flag for what the desk picked out
 * that was null on all 514 items of a capture — and a schema that held those to a type would let a change to a key
 * nobody reads cost the reader every item of a list: a `slug` sent as null tomorrow would set all thirty aside. An
 * object schema drops the keys it does not name, which is what they are owed.
 *
 * `author` and `image_caption` come as null, or not at all, on items of every route. `article_format` is left out only
 * by the sectioned front `a-la-une`, a route the app does not ask; it is read as optional all the same, and an item
 * without one is read as the classic article it would be.
 */
export const REMOTE_POST = z.object({
  id: REMOTE_ID,
  date: z.string(),
  title: z.string(),
  description: z.string(),
  excerpt: z.string(),
  image: z.string(),
  image_caption: z.string().nullish(),
  author: z.string().nullish(),
  article_format: REMOTE_FORMAT.optional(),
  premium: z.boolean(),
  right: z.boolean(),
  video_url: z.string().optional(),
});
export type RemotePost = z.infer<typeof REMOTE_POST>;

/**
 * The body an article answer carries, when it carries one: an array the service has only ever filled with one string,
 * the whole article as WordPress rendered it, scripts and donation form included. Splitting it is the reading's work.
 *
 * It is apart from the item because the service leaves it out: an article a reader has no right to comes with every
 * field of the item and no `content_array` at all — measured on the phone, 23/09/2026, on a reserved article asked
 * for without a token. An answer is therefore read as an item first, and as a body only where the item says the
 * reader may have one.
 */
export const REMOTE_BODY = z.object({ content_array: z.array(z.string()) });

/**
 * How many items each list of the service answers at once, as the capture of 21/09/2026 measured them.
 *
 * A section's own list and a search are paged, thirty and ten at a time: a client knows a page is the last when it
 * comes short, so it is held to these. The front and the wire come in one answer each — thirteen and ten — and the
 * service was never seen to page either: a client reads whatever they hold, and only a source that stands in for the
 * service, laying out its own paper at the paper's geometry, needs their size.
 */
export const SERVICE_PAGES = { front: 13, wire: 10, section: 30, search: 10 } as const;

/**
 * What every list of the service answers — the front, the wire, a section's own list and a search: its items, each
 * left unread here.
 *
 * The envelope is read whole and the items one by one. An envelope that held its items to `REMOTE_POST` would refuse
 * a list of thirty for one odd item, which is exactly what a reading of the service must not do: the items are read
 * by the reading, which serves what it can and names what it cannot. A search wraps the same list beside a `success`
 * flag the service has only ever set true; nothing reads it, so a search is read as any other list.
 */
export const REMOTE_LIST = z.object({ posts: z.array(z.unknown()) });

/**
 * The key the service names its list of sections with. Written as a string and read through it, so the wire keeps its
 * own language and the glossary keeps ours: no identifier of this repo is ever spelled in French.
 *
 * Exported so the answers a capture records write the key through this same constant rather than a copy of it: the
 * tool that writes them and the module they are written into each declared their own, and it was four spellings.
 */
export const SECTIONS_KEY = 'rubriques';

/** The menu of the service: its sections, each left unread here for the reading to take one at a time. */
export const REMOTE_MENU = z.object({ [SECTIONS_KEY]: z.array(z.unknown()) });

/**
 * A section as the menu lists it: the number the service files its list under, the name it prints, and the slug the
 * app knows it by. The rest of what the menu sends — a link to the site, a description always empty, and a `count`
 * repeated for every section that counts nothing — is read by no one, so the reading holds nothing to it.
 */
export const REMOTE_SECTION = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
});
