import { DONATION, SECTIONS_KEY } from '@huma/contracts';
import { isRecord } from '@huma/kit/records';
import { routeOf, SERVICE_ROOT } from '@huma/remote-api';
import type { RouteName } from '@huma/remote-api';
import type { Exchange } from './har.ts';

/**
 * Choosing, from a recorded session, the few answers worth keeping — and writing them down as a module.
 *
 * A capture holds hundreds of exchanges and most of them say nothing about the journal: telemetry, fonts, a payment
 * form, a video player. What is kept is one answer per route the app reads, and one article per format the journal
 * files. The point is not to archive a session, it is to hold the schemas against what the service really answers,
 * and for that a handful of answers is enough — provided they are the right ones.
 *
 * Two things are trimmed, and both for the same reason: what is written here is tracked by git and pushed to a
 * remote, and the prose of a newspaper belongs to the newspaper. A list keeps one item per distinct shape rather
 * than all thirty, and an article keeps the opening of its body and the head of the donation block that closes it.
 * A shape is what a schema is held against; the rest is somebody's copy.
 *
 * What a future capture adds, it adds by itself: articles are keyed by the format the service gave them, so a
 * session that opens a kind of article no capture has shown yet lands under a new key, and the tests that walk that
 * table cover it without a line changing.
 *
 * Each answer is kept with the request that asked it — its path under the service's root and its query — so a test can
 * replay it at the address a client asks, and a rule can hold the client's addresses to the ones the official client
 * actually used.
 */

/** Where the answers a capture keeps are written down: beside the client of the service they are the answers of. */
export const RECORDED_PATH = 'packages/remote-api/src/recorded.ts';

/**
 * How much of an article's body is kept: enough to read a structure, never enough to read the article.
 *
 * Measured on the interview of the capture, where the shapes that matter sit at these offsets: the journal's own
 * question block at 10, an outbound link at 613, a « Sur le même thème » aside at 1 180, a run of bold at 7 276. A
 * budget under that leaves a reading untested on something it has to get right — at 3 500 the second question of an
 * interview fell outside, and a test that counts them went red. Eight thousand signs is about ten paragraphs.
 */
const BODY_SIGNS = 8000;

/** How much of the donation block is kept. What a reading cuts, it cuts by position, so its head proves the cut. */
const DONATION_SIGNS = 400;

/** The routes whose answer is a list, kept one answer each; an article is kept per format instead. */
type ListRoute = Exclude<RouteName, 'article'>;

/** The list routes, in the order this repository reads them and writes them down. */
const LISTS: readonly ListRoute[] = ['front', 'wire', 'menu', 'section', 'search'];

/**
 * How many items of a list are kept, per list route — a list is kept for its shapes, not for its length — and none
 * for the menu, which is kept whole: its eleven sections are its shape.
 */
const ITEMS = { front: 5, wire: 4, menu: undefined, section: 6, search: 3 } as const satisfies Readonly<
  Record<ListRoute, number | undefined>
>;

/** A body of the service, read far enough to be sorted and trimmed but not modelled: that is the contracts' work. */
type Post = Readonly<Record<string, unknown>>;
type Body = Readonly<Record<string, unknown>>;

const postsOf = (body: Body): readonly Post[] => {
  const posts: unknown = body['posts'];
  return Array.isArray(posts) ? posts.flatMap((item: unknown): readonly Post[] => (isRecord(item) ? [item] : [])) : [];
};

/** A field of the wire read as the word it is, or the word that says it was not one. */
const wordOf = (value: unknown, absent: string): string => (typeof value === 'string' ? value : absent);

/**
 * What makes one item of a list tell a reader something another does not: the format the journal gave it, whether it
 * is reserved, and which of the fields it may leave out it actually carries. Two items of the same shape hold a schema
 * to the same thing; a free item and a reserved one do not, the reserved one being where a body can be kept back.
 */
const shapeOf = (post: Post): string =>
  [
    wordOf(post['article_format'], 'none'),
    post['premium'] === true ? 'premium' : 'free',
    post['image_caption'] === undefined ? 'no-caption' : post['image_caption'] === null ? 'null-caption' : 'caption',
    post['video_url'] === undefined ? 'no-video' : 'video',
    post['author'] === null ? 'no-author' : 'author',
    post['excerpt'] === '' ? 'no-excerpt' : 'excerpt',
    typeof post['id'],
  ].join('/');

/** One item per distinct shape, in the order the service sent them, up to `most`. */
const varied = (posts: readonly Post[], most: number): readonly Post[] => {
  const seen = new Set<string>();
  const kept: Post[] = [];
  for (const post of posts) {
    const shape = shapeOf(post);
    if (seen.has(shape)) {
      continue;
    }
    seen.add(shape);
    kept.push(post);
    if (kept.length === most) {
      break;
    }
  }
  return kept;
};

/** The opening of a body and the head of the block that closes it, cut on a paragraph so the sample stays whole. */
const trimBody = (html: string): string => {
  const mark = html.indexOf(DONATION);
  const stop = html.lastIndexOf('</p>', BODY_SIGNS);
  const head = html.slice(0, stop > 0 ? stop + 4 : BODY_SIGNS);
  if (mark < 0) {
    return head;
  }
  const tail = `${html.slice(mark, mark + DONATION_SIGNS)}\n<!-- … bloc de don tronqué … -->`;
  return mark <= head.length ? `${html.slice(0, mark)}${tail}` : `${head}\n<!-- … corps tronqué … -->\n${tail}`;
};

const trimArticle = (body: Body): Body => {
  const parts = body['content_array'];
  if (!Array.isArray(parts)) {
    return body;
  }
  const kept = parts.map((part: unknown): unknown => (typeof part === 'string' ? trimBody(part) : part));
  return { ...body, content_array: kept };
};

/** An answer kept, with the request that asked it: the path under the service's root, and the query as it was sent. */
type Kept = Readonly<{ path: string; query: string; answer: Body }>;

/** What a reading of a capture chose, and what it could not find. */
export type Chosen = Readonly<{
  answers: Readonly<Partial<Record<ListRoute, Kept>>>;
  articles: Readonly<Record<string, Kept>>;
  missing: readonly string[];
}>;

/** The path of an exchange under the service's root, which is how a route names it. */
const underRoot = (path: string): string => (path.startsWith(SERVICE_ROOT) ? path.slice(SERVICE_ROOT.length) : path);

/** Whether an exchange is an answer of the journal's service, in JSON, that went through. */
const served = (exchange: Exchange): boolean =>
  exchange.status === 200 && exchange.mime === 'application/json' && exchange.responseBody !== null;

const bodyOf = (exchange: Exchange): Body | null => {
  try {
    const parsed: unknown = JSON.parse(exchange.responseBody ?? '');
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * The answers worth writing down, out of everything a session recorded.
 *
 * A route is taken from the first exchange that answered it — a capture often asks twice, and the first answer is
 * the one the app acted on. An article is taken per format, and the fullest body of that format wins: a capture may
 * hold the same article twice, once truncated by a cache.
 */
export const chooseAnswers = (exchanges: readonly Exchange[]): Chosen => {
  const answers: Partial<Record<ListRoute, Kept>> = {};
  const articles: Record<string, Kept> = {};
  const sizes: Record<string, number> = {};
  for (const exchange of exchanges) {
    const body = served(exchange) ? bodyOf(exchange) : null;
    const route = routeOf(exchange.path);
    if (body === null || route === undefined) {
      continue;
    }
    const request = { path: underRoot(exchange.path), query: exchange.query };
    if (route === 'article') {
      const format = wordOf(body['article_format'], 'unknown');
      const size = JSON.stringify(body).length;
      if (Array.isArray(body['content_array']) && size > (sizes[format] ?? 0)) {
        sizes[format] = size;
        articles[format] = { ...request, answer: trimArticle(body) };
      }
      continue;
    }
    if (answers[route] === undefined) {
      const most = ITEMS[route];
      answers[route] = {
        ...request,
        answer: most === undefined ? body : { ...body, posts: varied(postsOf(body), most) },
      };
    }
  }
  const missing = [
    ...LISTS.filter((route) => answers[route] === undefined),
    ...(Object.keys(articles).length === 0 ? ['article'] : []),
  ];
  return { answers, articles, missing };
};

/**
 * The module a reading writes, ready to be formatted and tracked.
 *
 * Keys are laid out in the order this repository reads the routes, and articles in the order of their format, never
 * in the order a session happened to record them. Two readings of one capture then write the same bytes, and a
 * reading of the next capture moves only what actually changed instead of reshuffling the file.
 */
export const moduleOf = (chosen: Chosen): string => {
  const formats = Object.keys(chosen.articles).toSorted((left, right) => left.localeCompare(right));
  const table = {
    ...Object.fromEntries(
      LISTS.flatMap((route) => {
        const kept = chosen.answers[route];
        return kept === undefined ? [] : [[route, kept] as const];
      }),
    ),
    articles: Object.fromEntries(formats.map((format) => [format, chosen.articles[format]] as const)),
  };
  const written = JSON.stringify(table, null, 2).replace(`"${SECTIONS_KEY}":`, '[SECTIONS_KEY]:');
  return `/**
 * Real answers of the journal's service, each with the request that asked it, so a reading is held against what the
 * service sends and a client against the addresses the official client used. Written by \`pnpm capture:read\`; never
 * edited by hand.
 *
 * Bodies are trimmed: the opening of the prose and the head of the donation block the service closes every article
 * with. The block is what a reading has to recognise and cut, so its head is kept; the prose is the journal's to
 * publish, so only enough of it is kept to read a structure. Nothing here is ever served to a reader.
 *
 * Articles are keyed by the format the service gave them. This capture held ${formats.length === 0 ? 'none' : formats.map((format) => `\`${format}\``).join(', ')}.
 * A session that opens a format no capture has shown yet lands under a new key, and the tests that walk this table
 * cover it without a line changing.
 */

import { SECTIONS_KEY } from '@huma/contracts';

export const RECORDED = ${written} as const;
`;
};
