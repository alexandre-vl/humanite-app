import type { ArticleId } from '@huma/contracts';
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

// A section has no address of its own any more, and no screen. It is a page of the front screen, turned by swiping
// across it or by pressing its name in the band, so there is nowhere to send a reader who chose one — there is only
// a page to turn to. What the app had was a route nothing could reach except that band, and a screen that replaced
// itself every time another section was chosen.

// A numéro has no address in the app any more either, and for a plainer reason than a section: it is not read here.
// The shelf still stands every numéro the paper printed, and taking one off it opens the paper on the web — which is
// an address the newsroom owns and this module names among the others, under `NEWSROOM`.

/** Where the reader sets how the paper is printed for them. */
export const SETTINGS_HREF = '/settings' as const;

/**
 * Where the numéros stand. It is a screen pushed from the account and no longer a tab: everything a reader does on
 * that shelf leaves the app for humanite.fr, and a destination one comes back to is not the same thing as a door out.
 */
export const NEWSSTAND_HREF = '/newsstand' as const;

// What the reader kept has no address written here any more. It is a tab, and a tab is not pushed: the bar at the
// bottom stands on it directly, so nothing in the app sends a reader there — the front page's masthead did, and the
// account did, and both were doors to a destination already under them. The route file still holds the address, and
// a deep link still finds it; this module names what the app itself asks for.

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
