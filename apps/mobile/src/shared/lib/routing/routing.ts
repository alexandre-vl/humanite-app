import type { ArticleId } from '@huma/contracts';
import { openURL } from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';

/** The parameters of a route as it hands them over: strings, one or several under a name, or none at all. */
export type RawParams = Readonly<Record<string, string | readonly string[] | undefined>>;

/** Where one article is read, as the router takes it. */
export type ArticleHref = Readonly<{ pathname: '/article/[id]'; params: Readonly<{ id: ArticleId }> }>;

/**
 * Where to send a reader who chose an article. Four screens open one — the front page with the sections it turns
 * through, the wire, a search and the reader's shelf — and each wrote out the same route and the same parameter name.
 * Written four times, a route is four places to change and three chances to miss one; the file name that mints it
 * stays the single source, and this is the one sentence the rest of the app says about it.
 */
export const articleHref = (id: ArticleId): ArticleHref => ({ pathname: '/article/[id]', params: { id } });

// Neither a section nor a numéro has an address here. A section is a page of the front screen, turned by a swipe or by
// its name in the band, so there is only a page to turn to; a numéro is not read in the app, and taking one off the
// shelf opens the paper on the web, at an address the newsroom owns and `NEWSROOM` names.

/** Where the reader sets how the paper is printed for them. */
export const SETTINGS_HREF = '/settings' as const;

/**
 * Where a subscriber signs in. A screen and not a sheet: the two fields want the whole width a keyboard leaves, and
 * a reader whose password manager takes over the screen should come back to the form, not to whatever was under it.
 */
export const SIGN_IN_HREF = '/sign-in' as const;

/**
 * Where the numéros stand: a screen pushed from the account, and not a tab. Everything a reader does on that shelf
 * leaves the app for humanite.fr, and a door out is not a destination one comes back to.
 */
export const NEWSSTAND_HREF = '/newsstand' as const;

// What the reader kept has no address written here: it is a tab, which the bar at the bottom stands on directly, so
// nothing in the app pushes a reader there. The route file holds the address, and a deep link finds it; this module
// names what the app itself asks for.

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
