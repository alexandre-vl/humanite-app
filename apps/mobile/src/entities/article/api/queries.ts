import type {
  Article,
  ArticleId,
  ArticleSummary,
  FeedQuery,
  Page,
  PageQuery,
  Question,
  SearchQuery,
  SectionId,
} from '@huma/contracts';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every article key starts with: one entity, one namespace in the cache the app persists. */
const ARTICLES = 'articles';

/**
 * The branch a reading of the reader's own making is filed under: what they asked for.
 *
 * It is named apart from the rest because the app asks about it: such a reading is worth answering from memory while
 * the reader is still on the screen, and not worth keeping on disk after — see the persistence options, which read
 * this and nothing else about a key.
 */
const SEARCH = 'search';

/** The branch one article is filed under, apart from every branch that holds a list of them. */
const ONE = 'one';

/**
 * No cursor at all: the content serves the first page to a query that asks for none. It is an empty string rather than
 * `null` because the cursor type is read off this value — `null` would fix it to `null` and the cursors the content
 * mints would no longer fit.
 */
const FIRST = '';

/** The query that reads the page `cursor` opens, a cursor staying an opaque string the content alone mints. */
const at = (cursor: string): PageQuery => (cursor === FIRST ? {} : { cursor });

/**
 * The key of every reading of articles, minted here and nowhere else. Two screens asking for the same pages under two
 * hand-written keys would each hold their own copy, and neither would see what the other had already read.
 */
const KEYS = {
  feed: (): readonly string[] => [ARTICLES, 'feed'],
  section: (section: SectionId): readonly string[] => [ARTICLES, 'section', section],
  live: (): readonly string[] => [ARTICLES, 'live'],
  search: (text: string): readonly string[] => [ARTICLES, SEARCH, text],
  one: (id: ArticleId): readonly string[] => [ARTICLES, ONE, id],
} as const;

/**
 * A feed read page by page: the key it is filed under, the reading that turns a cursor into a page, and whether it is
 * to be read at all. Where the pages come from is nearly all that separates the four below, so it is nearly all they
 * state.
 */
const paged = (
  queryKey: readonly string[],
  read: (query: PageQuery) => Promise<Page<ArticleSummary>>,
  enabled = true,
  keepsPrevious = false,
) =>
  infiniteQueryOptions({
    queryKey,
    queryFn: async ({ pageParam }) => read(at(pageParam)),
    initialPageParam: FIRST,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
    ...(keepsPrevious ? { placeholderData: keepPreviousData } : {}),
  });

/**
 * The options of a paged feed of articles: a screen composes them, it never writes them. The type is read off the
 * factory rather than off one of the four feeds, so naming it never ties every reader to what that one feed happens
 * to do today.
 */
export type PagedFeed = ReturnType<typeof paged>;

/** The front, in the order its source lays it out: what the À la une screen reads. */
export const feedQuery = paged(KEYS.feed(), async (query) => content.getFeed(query));

/**
 * The articles of one section, newest first, by pages. The section is part of the key, so each one keeps the pages it
 * has already read, and coming back to a section does not throw away what another one is holding.
 */
export const sectionFeedQuery = (section: SectionId): PagedFeed =>
  paged(KEYS.section(section), async (query) => {
    const filtered: FeedQuery = { ...query, section };
    return content.getFeed(filtered);
  });

/** The running wire, the newest first: what the En continu screen reads. */
export const liveFeedQuery = paged(KEYS.live(), async (query) => content.getLiveFeed(query));

/** What a search that asks nothing holds: no page, and none after it. */
const UNASKED: Page<ArticleSummary> = { items: [], nextCursor: null };

/**
 * The articles a reader's question reaches, in the order the source ranks them, by pages. The content is asked only
 * once there is a question: an empty field or a single letter would ask for very nearly the whole paper, and until
 * then the reading stands idle under a key of its own.
 */
export const searchQuery = (question: Question | null): PagedFeed =>
  question === null
    ? paged(KEYS.search(''), async () => Promise.resolve(UNASKED), false)
    : paged(
        KEYS.search(question),
        async (query) => {
          const asked: SearchQuery = { ...query, text: question };
          return content.search(asked);
        },
        true,
        // Each question is its own key, so a new one arrives with nothing under it and the screen used to go from an
        // answer to nine grey bars on every settled keystroke — for the second and a half the journal's search takes
        // (mesuré le 24/09/2026 : 1 552 à 1 923 ms, et jamais servie d'un cache, une question n'étant jamais deux
        // fois la même). The answer already on screen stays until the next one is there to take its place.
        true,
      );

/** Whether a key in the cache is a reading of the reader's own making rather than a reading of the paper. */
export const isReaderKey = (key: readonly unknown[]): boolean => key[0] === ARTICLES && key[1] === SEARCH;

/** One article, body and all, under the key of its id. */
const one = (id: ArticleId) =>
  queryOptions({ queryKey: KEYS.one(id), queryFn: async (): Promise<Article> => content.getArticle(id) });

/**
 * The reading of one article: what the reading screen reads, and what the screen around it reads too when it has
 * something of its own to do with the article — both under this one key, so the article is asked for once. The type
 * is read off the factory, which is where the library writes it.
 */
export const articleQuery = (id: ArticleId): ReturnType<typeof one> => one(id);

/**
 * Every summary the app is already holding, from every list it has read — the front, each section, the wire, and
 * whatever a question turned up, whether they are on screen now or came off the disk at the last start.
 *
 * Only the lists. An article read whole is filed under its own key and is not a list of anything, so it is left out
 * rather than flattened past: the predicate is the one place that says so, and the type that follows it would be a
 * lie for that branch.
 */
const summariesRead = (cache: QueryClient): readonly ArticleSummary[] =>
  cache
    .getQueriesData<InfiniteData<Page<ArticleSummary>>>({
      queryKey: [ARTICLES],
      predicate: ({ queryKey }) => queryKey[1] !== ONE,
    })
    .flatMap(([, read]) => read?.pages.flatMap((page) => [...page.items]) ?? []);

/**
 * What the app already knows of one article, from the lists it has read, or nothing when it knows none of it.
 *
 * A reader reaches an article by touching a card, and that card was drawn from a summary — a title, a standfirst, a
 * signature, an hour, a picture. All of it is the article's own: `ARTICLE` is `ARTICLE_SUMMARY` with a body added.
 * So the screen that opens has, before it asks the service anything, every field of the article but the one that
 * takes the longest to fetch, and the head of the page can be drawn at once instead of standing in for itself.
 *
 * It answers from what is in the cache at the moment it is called, and does not watch for more: an article opened
 * from a list is known, one opened from a link is not, and neither changes on the way in.
 */
export const summaryAmongRead = (cache: QueryClient, id: ArticleId): ArticleSummary | null =>
  summariesRead(cache).find((summary) => summary.id === id) ?? null;

/**
 * Asks for an article before anyone has asked to read it, and keeps quiet about how it goes.
 *
 * A finger resting on a card is a reading about to be asked for: the press, the lift and the screen sliding in are
 * together a few hundred milliseconds, and the service answers an article it has not served lately in about as long
 * (mesuré le 24/09/2026 : 743 ms au plus froid, 25 ms une fois chaud). Started when the finger lands rather than
 * when the screen mounts, the two run at once and the body is usually there before the page has finished arriving.
 *
 * A fresh answer is not asked for twice: the library holds the reading to the same staleness as any other, so a card
 * pressed again inside the minute costs nothing. A failure is swallowed, because nobody asked for this yet — the
 * screen that does ask will raise it, in its own place, with its own words.
 */
export const prefetchArticle = (cache: QueryClient, id: ArticleId): void => {
  cache.query(articleQuery(id)).catch(() => undefined);
};

/**
 * The words of a summary a question could be looking for, folded so that a question written without its accents and
 * in any case still finds them: the title, and what is printed under it when there is any.
 */
const wordsOf = (summary: ArticleSummary): string =>
  `${summary.title} ${summary.standfirst ?? ''}`.normalize('NFD').replace(DIACRITICS, '').toLowerCase();

/** Everything the combining marks of a decomposed string are, so `ecologie` reaches « écologie ». */
const DIACRITICS = /\p{Diacritic}/gu;

/**
 * The articles already in hand whose words hold the question, newest read first.
 *
 * The journal's own search takes between a second and a half and two seconds and is never served from a cache — a
 * question is never twice the same, so there is nothing to have kept (mesuré le 24/09/2026 : 1 552 à 1 923 ms on
 * eight words never asked before). For all that time the screen had nothing at all to show on a first question.
 *
 * It has something. Every list the app has read is a few dozen summaries in memory, and a reader asking about Gaza
 * has very often just scrolled past three pieces on it. This finds them at once, and it is not a guess at what the
 * journal would answer: it is a true and smaller answer to the same question, which the screen names as what it is
 * and drops the moment the journal's own arrives.
 *
 * Matching is on the words a reader can see — the title and the standfirst — and not on the body, which is not here
 * to be matched. Accents and case are folded, so a question typed in a hurry reaches what was printed properly.
 */
export const summariesMatching = (cache: QueryClient, question: Question): readonly ArticleSummary[] => {
  const asked = question.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
  return summariesRead(cache).filter((summary) => wordsOf(summary).includes(asked));
};
