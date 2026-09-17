import type { Article, ArticleSummary } from './article.ts';
import type { Author, Section } from './content.ts';
import type { ArticleId, SectionId } from './ids.ts';
import type { Page } from './page.ts';
import type { Session } from './session.ts';

/** What a feed query selects: a section, a page cursor and a page size. */
export type FeedQuery = Readonly<{ section?: SectionId; cursor?: string; limit?: number }>;

/** What the live feed query selects: a page cursor and a page size. */
export type LiveQuery = Readonly<{ cursor?: string; limit?: number }>;

/** What a search query selects: the text, a page cursor and a page size. */
export type SearchQuery = Readonly<{ text: string; cursor?: string; limit?: number }>;

/** The read surface of the content, which the mock and the app both speak. */
export type ContentApi = Readonly<{
  getSections: () => Promise<readonly Section[]>;
  getAuthors: () => Promise<readonly Author[]>;
  getFeed: (query: FeedQuery) => Promise<Page<ArticleSummary>>;
  getLiveFeed: (query: LiveQuery) => Promise<Page<ArticleSummary>>;
  getArticle: (id: ArticleId) => Promise<Article>;
  search: (query: SearchQuery) => Promise<Page<ArticleSummary>>;
  getSession: () => Promise<Session>;
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
