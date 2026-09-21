import type { ArticleId, IssueId, SectionId } from '@huma/contracts';
import { openURL } from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';

/** The parameters of a route as it hands them over: strings, one or several under a name, or none at all. */
export type RawParams = Readonly<Record<string, string | readonly string[] | undefined>>;

/** Where one article is read, as the router takes it. */
export type ArticleHref = Readonly<{ pathname: '/article/[id]'; params: Readonly<{ id: ArticleId }> }>;

/**
 * Where to send a reader who chose an article. Five screens open one — the front page, the wire, a section, a search
 * and an article following its own link — and each wrote out the same route and the same parameter name. Written five
 * times, a route is five places to change and four chances to miss one; the file name that mints it stays the single
 * source, and this is the one sentence the rest of the app says about it.
 */
export const articleHref = (id: ArticleId): ArticleHref => ({ pathname: '/article/[id]', params: { id } });

/** Where one section is read, as the router takes it. */
export type SectionHref = Readonly<{ pathname: '/section/[id]'; params: Readonly<{ id: SectionId }> }>;

/** Where to send a reader who chose a section, for the same reason: the front page opens one, a section replaces itself. */
export const sectionHref = (id: SectionId): SectionHref => ({ pathname: '/section/[id]', params: { id } });

/** Where one numéro is read, as the router takes it. */
export type IssueHref = Readonly<{ pathname: '/issue/[id]'; params: Readonly<{ id: IssueId }> }>;

/** Where to send a reader who took a numéro off the shelf. */
export const issueHref = (id: IssueId): IssueHref => ({ pathname: '/issue/[id]', params: { id } });

/** Where the reader sets how the paper is printed for them. */
export const SETTINGS_HREF = '/settings' as const;

/** Where the reader finds again what they kept of the paper. */
export const BOOKMARKS_HREF = '/bookmarks' as const;

/**
 * Hands a page outside the app to whatever the phone opens pages with.
 *
 * It sits beside the routes for the same reason they do: this module is where the app says where something leads, and
 * a page it does not hold is still somewhere it sends a reader. Whether anything answered is not reported back — the
 * reader watches their own browser open, and an app that has already left the screen has nothing left to say about it.
 */
export function openExternal(url: string): void {
  void openURL(url);
}

/**
 * The parameters of the route a screen is showing, read by `read`.
 *
 * The reader is a function rather than a schema because the app may not declare zod — only the contracts package may.
 * What makes a screen validate is therefore the type it asks for: an identifier of the contracts is a branded string
 * that nothing but its own parser produces, so a screen that declares one cannot take it from a raw parameter, and a
 * malformed deep link throws in the parser and lands on the route's own error screen.
 */
export function useRouteParams<Params>(read: (raw: RawParams) => Params): Params {
  return read(useLocalSearchParams());
}
