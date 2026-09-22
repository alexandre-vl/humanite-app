import type { z } from 'zod';
import type { Article, ArticleSummary } from './article.ts';
import { ARTICLE, ARTICLE_SUMMARY } from './article.ts';
import { instantAt } from './clock.ts';
import type { ArticleFormat } from './enums.ts';
import type { SectionId } from './ids.ts';
import { PICTURE } from './picture.ts';
import { readPlain, readProse } from './prose.ts';
import type { RemoteFormat, RemotePost } from './remote.ts';
import { REMOTE_ARTICLE, REMOTE_POST } from './remote.ts';

/**
 * How what the journal's service answers becomes what a screen may show — item by item, and never in silence.
 *
 * A list of the service is read one item at a time rather than as a whole. A whole that failed on one odd item would
 * cost the reader the thirty others around it, and a service this app does not hold will, sooner or later, send one
 * odd item. So each item is read by the contracts' own schemas, and what cannot be read is not served — that much is
 * what a schema is for — but it is not dropped either: it is set aside, where it sat, with the reason. A list half
 * empty and nothing anywhere saying why is the worst of both: the app has stopped working and no one can tell.
 *
 * What comes out is therefore always two things, what was kept and what was set aside, and a caller that serves the
 * first has the second in hand to count, to report, or to judge the answer by — a list where most items were set
 * aside is not a list the service meant to send.
 */

/** One answer a reading could not make into an item: where it sat in the answer, and what stopped it. */
type SetAside = Readonly<{ at: number; says: string }>;

/** What a reading of a list kept, in the order the service sent it, and what it set aside, each with its reason. */
export type Intake<Item> = Readonly<{ kept: readonly Item[]; setAside: readonly SetAside[] }>;

/** One answer read: the item it was, or why it was none. */
export type Read<Item> = Readonly<{ item: Item }> | Readonly<{ refused: string }>;

/** What a reading may know that the answer does not say: the section whose own list it is reading. */
export type Context = Readonly<{ section?: SectionId }>;

/**
 * The service's word for an article of a series. Written as a string and used through it, as the wire's other words
 * are, so the table below keeps the service's key without an identifier of this repo being spelt in French.
 */
const SERIES = 'serie';

/**
 * The shapes the service gives an item, as the screens know them. Written as a total table over the service's own
 * list, so a fifth shape added to the wire is a type error here before it is anything else.
 *
 * `opinion` is a column: the items the service files under it are the paper's signed pieces — its chroniqueurs and
 * its editorials — and a column is what a card announces its writer on. An article of a series is read as an article.
 */
const FORMATS = {
  classic: 'article',
  opinion: 'column',
  video: 'video',
  [SERIES]: 'article',
} as const satisfies Readonly<Record<RemoteFormat, ArticleFormat>>;

/** Why a schema refused, as the one line a set-aside carries: which field, and what was wrong with it. */
const saysOf = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length === 0 ? 'réponse' : issue.path.map(String).join('.')} : ${issue.message}`)
    .join(' ; ');

/**
 * The picture an item carries, or nothing. A picture the contract refuses — one served from anywhere but the
 * journal's own pictures — costs the item its picture and not the item: a story with no photograph is still a story.
 */
const heroOf = (post: RemotePost): Readonly<Record<string, unknown>> | undefined => {
  if (post.image === '') {
    return undefined;
  }
  const picture = PICTURE.safeParse({ kind: 'journal', url: post.image });
  if (!picture.success) {
    return undefined;
  }
  const caption = readPlain(post.image_caption ?? '');
  return { picture: picture.data, ...(caption === '' ? {} : { caption }) };
};

/**
 * An item of the service as the contracts' schema is handed it. Every field of text is read as the line it is, the
 * date as the instant it names, and the flags as the words the domain uses for them.
 *
 * The standfirst is the journal's `chapo`, which it sets in `description`; its excerpt is the opening of the body, and
 * stands in only where the standfirst is empty — a signed column is often filed with an empty one. Of 519 items, none
 * came with both empty.
 */
const inputOf = (post: RemotePost, publishedAt: string, context: Context): Readonly<Record<string, unknown>> => {
  const standfirst = readPlain(post.description);
  const byline = readPlain(post.author ?? '');
  const hero = heroOf(post);
  return {
    id: post.id,
    format: FORMATS[post.article_format ?? 'classic'],
    access: post.premium ? 'premium' : 'free',
    title: readPlain(post.title),
    standfirst: standfirst === '' ? readPlain(post.excerpt) : standfirst,
    publishedAt,
    ...(context.section === undefined ? {} : { section: context.section }),
    ...(byline === '' ? {} : { byline }),
    ...(hero === undefined ? {} : { hero }),
    ...(post.highlighted === true ? { emphasis: true } : {}),
  };
};

/** An item the wire's schema has read, read again as the domain's. */
const summaryOf = (post: RemotePost, context: Context): Read<ArticleSummary> => {
  const publishedAt = instantAt(post.date);
  if (publishedAt === null) {
    return { refused: `date : « ${post.date} » ne nomme aucun instant` };
  }
  const summary = ARTICLE_SUMMARY.safeParse(inputOf(post, publishedAt, context));
  return summary.success ? { item: summary.data } : { refused: saysOf(summary.error) };
};

/** One item of a list of the service, read. */
const readPost = (raw: unknown, context: Context): Read<ArticleSummary> => {
  const wire = REMOTE_POST.safeParse(raw);
  return wire.success ? summaryOf(wire.data, context) : { refused: saysOf(wire.error) };
};

/**
 * A list of the service, read item by item: what could be read, in the order the service sent it, and what could
 * not, each where it sat.
 *
 * The order is kept because it is the newsroom's. The front page of the service comes in the order its desk laid it
 * out and not by date, and a reading that sorted would print another paper than the one the journal made.
 */
export const readSummaries = (posts: readonly unknown[], context: Context = {}): Intake<ArticleSummary> => {
  const kept: ArticleSummary[] = [];
  const setAside: SetAside[] = [];
  for (const [at, raw] of posts.entries()) {
    const read = readPost(raw, context);
    if ('item' in read) {
      kept.push(read.item);
    } else {
      setAside.push({ at, says: read.refused });
    }
  }
  return { kept, setAside };
};

/** An article of the service, read whole: its summary as a list reads it, and its body as blocks. */
export const readArticle = (body: unknown): Read<Article> => {
  const wire = REMOTE_ARTICLE.safeParse(body);
  if (!wire.success) {
    return { refused: saysOf(wire.error) };
  }
  const summary = summaryOf(wire.data, {});
  if ('refused' in summary) {
    return summary;
  }
  const article = ARTICLE.safeParse({ ...summary.item, blocks: readProse(wire.data.content_array.join('')) });
  return article.success ? { item: article.data } : { refused: saysOf(article.error) };
};

/**
 * The name of one thing a reading of a list can get wrong. A union rather than a list, nothing ever walking the codes:
 * a judging names each it finds, and a fixture names the set it expects.
 */
export type IntakeCode =
  'intake/unreadable-kept' | 'intake/readable-dropped' | 'intake/loss-unnamed' | 'intake/order-lost';

/** One thing a judging found wrong, and what it read to find it out. */
export type IntakeFinding = Readonly<{ code: IntakeCode; says: string }>;

/** A way of reading a list of the service, which is what the judging below is handed rather than reaching for one. */
export type Take = (posts: readonly unknown[]) => Intake<ArticleSummary>;

/** What every item of the sample shares: an item the way the service sends one, with no picture to keep it short. */
const POST = {
  type: 'post',
  slug: 'un-article',
  excerpt: '',
  image: '',
  image_caption: null,
  author: 'La rédaction',
  article_format: 'classic',
  has_audio: false,
  premium: false,
  right: true,
  highlighted: null,
} as const;

/** The two items of the sample a reading must serve, in the order the service sent them. */
const READABLE = ['3900001', '3900003'] as const;

/** The item of the sample no reading may serve: it carries a fifth format, which the wire does not know. */
const UNREADABLE = '3900002';

/**
 * A list shaped the way the service shapes one, small enough to read at a glance: two items it can serve and, between
 * them, one it cannot. The hours run neither forwards nor backwards, as a desk's front page does not, so a reading
 * that sorted would be seen to have.
 */
const SAMPLE: readonly unknown[] = [
  { ...POST, id: READABLE[0], date: '2026-09-21T09:00:00', title: 'Un', description: '<p class="chapo">Un.</p>' },
  {
    ...POST,
    id: UNREADABLE,
    date: '2026-09-21T08:00:00',
    title: 'Deux',
    description: '<p class="chapo">Deux.</p>',
    article_format: 'podcast',
  },
  { ...POST, id: READABLE[1], date: '2026-09-21T10:00:00', title: 'Trois', description: '<p class="chapo">Trois.</p>' },
];

/**
 * Whether a way of reading a list serves only what it could read, serves all of it and in the service's order, and
 * names everything it did not serve.
 *
 * The reading is handed in rather than reached for, so a fixture can hand in one that falls back to a format it
 * knows, or refuses more than it must, or drops what it cannot read without a word, or sorts the list by date — and
 * read the code that comes back.
 */
export const judgeIntake = (take: Take): readonly IntakeFinding[] => {
  const intake = take(SAMPLE);
  const ids: readonly string[] = intake.kept.map((summary) => summary.id);
  const served = ids.filter((id) => READABLE.some((readable) => readable === id));
  const expected = READABLE.filter((readable) => served.includes(readable));
  return [
    ...(ids.includes(UNREADABLE)
      ? [{ code: 'intake/unreadable-kept' as const, says: `l’item ${UNREADABLE}, d’un format inconnu, a été servi` }]
      : []),
    ...(READABLE.some((readable) => !ids.includes(readable))
      ? [{ code: 'intake/readable-dropped' as const, says: 'un item que les schémas lisent n’a pas été servi' }]
      : []),
    ...(intake.kept.length + intake.setAside.length === SAMPLE.length
      ? []
      : [{ code: 'intake/loss-unnamed' as const, says: 'un item n’a été ni servi ni mis de côté avec sa raison' }]),
    ...(served.join() === expected.join()
      ? []
      : [{ code: 'intake/order-lost' as const, says: 'les items servis ne sont plus dans l’ordre de la rédaction' }]),
  ];
};
