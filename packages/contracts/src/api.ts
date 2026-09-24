import { z } from 'zod';
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

/**
 * What a reader asks a search: their words with the blank at either end gone, and never nothing. It is read once, where
 * the words were typed, so a source takes the question as it comes and no two sources trim it their own way.
 */
export const QUESTION = z.string().trim().min(1).brand('Question');
export type Question = z.infer<typeof QUESTION>;

/** A page of the articles a question reaches. */
export type SearchQuery = PageQuery & Readonly<{ text: Question }>;

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
 * a feed. A source may have no shelf at all — the journal's numéros are PDF files of a publisher's own reader, which
 * no JSON route of its service lists — and then it has no such method, and the app no newsstand.
 */
export type ContentApi = Readonly<{
  getSections: () => Promise<readonly Section[]>;
  getFeed: (query: FeedQuery) => Promise<Page<ArticleSummary>>;
  getLiveFeed: (query: PageQuery) => Promise<Page<ArticleSummary>>;
  getArticle: (id: ArticleId) => Promise<Article>;
  getIssues?: () => Promise<readonly IssueSummary[]>;
  search: (query: SearchQuery) => Promise<Page<ArticleSummary>>;
}>;

/**
 * Why a content read failed, as the one word a screen branches on. Each names a cause, not a symptom, because what a
 * reader is told and whether asking again can help both follow from the cause:
 *
 * - `not-found` — the source has no such piece, and asking again will not give it one;
 * - `refused` — the source will not serve this reader what was asked, and asking again as the same reader changes
 *   nothing;
 * - `expired` — the source refused a reading carried under a connection it no longer honours: the reader was signed
 *   in, is not any more, and asking again changes nothing until they sign in again. It is told apart from `refused`
 *   because the two are opposite situations wearing the same status — one reader is being told the thing is not
 *   theirs, the other that it is theirs and the app forgot how to prove it, and only the second is mended by the
 *   reader doing something;
 * - `offline` — the request never reached the source;
 * - `timeout` — the source did not answer within the time a read is given;
 * - `unavailable` — the source answered that it cannot serve now, or its answer was cut off on the way;
 * - `malformed` — the source answered something no reading can make an answer of.
 */
export const CONTENT_ERROR_CODE = z.enum([
  'not-found',
  'refused',
  'expired',
  'offline',
  'timeout',
  'unavailable',
  'malformed',
]);
export type ContentErrorCode = z.infer<typeof CONTENT_ERROR_CODE>;

/** An error the content api raises, tagged with a code the caller can branch on. */
export class ContentApiError extends Error {
  readonly code: ContentErrorCode;

  constructor(code: ContentErrorCode, message: string) {
    super(message);
    this.name = 'ContentApiError';
    this.code = code;
  }
}
