import { SERVICE_PAGES } from '@huma/contracts';
import type { FiledId, SectionNumber } from '@huma/contracts';

/**
 * The routes of the journal's service the app reads, written once: how each request is made, and which recorded path
 * answers it. The client asks through the first; the capture sorts a recorded session through the second; so neither
 * can drift from the other, and a route the official client never asked is a route the tests have no answer for.
 */

/** Where the service answers: its host, and the application the official client is filed under. */
export const SERVICE = 'https://phenix2.immanens.com';

/** The path every route of the service lives under: the version of its interface, and the application's number. */
export const SERVICE_ROOT = '/api/v1/app/300';

/** A request of the service: the path under its root, and the query it carries, in the order it is written. */
export type Request = Readonly<{ path: string; query: readonly (readonly [string, string])[] }>;

/**
 * What every request of a reader nobody signed in carries: French, and the flag that says no one did. The official
 * client sends both on every list it asks for, and `ano` exactly when it sends no token — 74 requests of 74 in its
 * capture. The app has no one signed in, so it sends both on everything.
 */
const ANONYMOUS = [
  ['language', 'fr'],
  ['ano', '1'],
] as const;

/**
 * The routes, each as the request that asks it and the pattern of the paths that answer it.
 *
 * A section's list is asked for at `/posts/`, with the slash: without it the service answers a redirect, served as
 * JSON and holding HTML, which the official client follows and a reading would have to recognise. A search puts its
 * question in the path, encoded as a component so a space or an accent travels as itself.
 */
export const ROUTES = {
  front: {
    request: (): Request => ({ path: '/wordpress/home', query: ANONYMOUS }),
    answers: /\/wordpress\/home$/u,
  },
  wire: {
    request: (): Request => ({ path: '/wordpress/homepage', query: ANONYMOUS }),
    answers: /\/wordpress\/homepage$/u,
  },
  menu: {
    request: (): Request => ({ path: '/wordpress/menu', query: ANONYMOUS }),
    answers: /\/wordpress\/menu$/u,
  },
  section: {
    request: (serviceId: SectionNumber, page: number): Request => ({
      path: `/wordpress/${String(serviceId)}/posts/`,
      query: [['page', String(page)], ...ANONYMOUS],
    }),
    answers: /\/wordpress\/\d+\/posts\/$/u,
  },
  article: {
    request: (id: FiledId): Request => ({
      path: `/wordpress/post/${id}`,
      query: [['type', 'post'], ['output_format', 'array'], ...ANONYMOUS],
    }),
    answers: /\/wordpress\/post\/\d+$/u,
  },
  search: {
    request: (text: string, page: number): Request => ({
      path: `/article/search/${encodeURIComponent(text)}`,
      query: [['page', String(page)], ['per_page', String(SERVICE_PAGES.search)], ...ANONYMOUS],
    }),
    answers: /\/article\/search\/[^/]+$/u,
  },
} as const satisfies Readonly<Record<string, Readonly<{ request: (...args: never[]) => Request; answers: RegExp }>>>;

/** A route of the service the app reads. */
export type RouteName = keyof typeof ROUTES;

/** The routes, in the order the app reads them: a list and not a key lookup, so nothing is narrowed by assertion. */
const NAMES: readonly RouteName[] = ['front', 'wire', 'menu', 'section', 'article', 'search'];

/** The route a path of the service answers, or `undefined` for a path the app never asks. */
export const routeOf = (path: string): RouteName | undefined => NAMES.find((name) => ROUTES[name].answers.test(path));

/** The address a request is sent to: the service, its root, the path, and the query, each part encoded. */
export const addressOf = (request: Request): string =>
  `${SERVICE}${SERVICE_ROOT}${request.path}?${request.query
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&')}`;

/**
 * What an address of the service asks, the other way round from `addressOf`: the path under the service's root, and
 * the query as it was written. `null` for an address anywhere else, which no request of this client is.
 */
export const partsOf = (address: string): Readonly<{ path: string; query: string }> | null => {
  const root = `${SERVICE}${SERVICE_ROOT}`;
  if (!address.startsWith(`${root}/`)) {
    return null;
  }
  const [path = '', query = ''] = address.slice(root.length).split('?');
  return { path, query };
};
