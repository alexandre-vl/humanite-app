import type { Article, ArticleSummary } from './article.ts';
import type { Section } from './content.ts';
import type { ArticleId, SectionId } from './ids.ts';
import type { IssueSummary } from './issue.ts';
import type { Page } from './page.ts';

/**
 * Which page of a list a query asks for: the cursor an earlier page handed back, or none for the first.
 *
 * It names no size. The source decides how much a page holds — the journal's service answers thirty items for a
 * section and ten for a search, whatever it is asked — and a size only one source could honour is a size the other
 * would silently ignore.
 */
export type PageQuery = Readonly<{ cursor?: string }>;

/** A page of the front, or of one section's own list when a section is named. */
export type FeedQuery = PageQuery & Readonly<{ section?: SectionId }>;

/** A page of the articles a question reaches. */
export type SearchQuery = PageQuery & Readonly<{ text: string }>;

/**
 * The read surface of the content, which every source serves and the app reads: what both the mock and the journal's
 * service can answer, and nothing only one of them could.
 *
 * `getFeed` with no section is the front, in the order its desk laid it out; with one, that section's own list, the
 * newest first. `getArticle` names one piece and fails when it is not there — asking for it is opening it.
 *
 * Nothing here reads several pieces by id. The journal's service has no route for it, and neither thing that asked for
 * one needs it: what a reader keeps is kept with its summary, and what a body points at comes written into the body.
 *
 * `getIssues` answers with every numéro at once: a day's paper is a closed thing of a few dozen pieces, and the
 * newsstand stands them in a row. It takes no cursor, because it has no next page — that is what tells a numéro from
 * a feed.
 */
export type ContentApi = Readonly<{
  getSections: () => Promise<readonly Section[]>;
  getFeed: (query: FeedQuery) => Promise<Page<ArticleSummary>>;
  getLiveFeed: (query: PageQuery) => Promise<Page<ArticleSummary>>;
  getArticle: (id: ArticleId) => Promise<Article>;
  getIssues: () => Promise<readonly IssueSummary[]>;
  search: (query: SearchQuery) => Promise<Page<ArticleSummary>>;
}>;

/** Why a content request failed. */
export const CONTENT_ERROR_CODES = ['not-found', 'unavailable', 'timeout'] as const;
export type ContentErrorCode = (typeof CONTENT_ERROR_CODES)[number];

/** An error the content api raises, tagged with a code the caller can branch on. */
export class ContentApiError extends Error {
  readonly code: ContentErrorCode;

  constructor(code: ContentErrorCode, message: string) {
    super(message);
    this.name = 'ContentApiError';
    this.code = code;
  }
}
