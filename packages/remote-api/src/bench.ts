import { RECORDED } from './recorded.ts';
import { routeAt } from './routes.ts';
import type { RouteName } from './routes.ts';
import type { Reply } from './transport.ts';

/**
 * What stands in for the service when the client is asked without a network: the judging of the client, and the
 * package's own tests, both reply from here, so the two cannot come to disagree about what the service answered.
 */

/** A reply as the service would give it: a status, and a body read as the text it arrives as. */
export const reply = async (status: number, text: string): Promise<Reply> =>
  Promise.resolve({ status, text: async () => Promise.resolve(text) });

/** What the capture recorded for each route: what a replay answers with, and what an address is held to. */
export const RECORDINGS: Readonly<
  Record<RouteName, readonly Readonly<{ path: string; query: string; answer: unknown }>[]>
> = {
  front: [RECORDED.front],
  wire: [RECORDED.wire],
  menu: [RECORDED.menu],
  section: [RECORDED.section],
  search: [RECORDED.search],
  article: Object.values(RECORDED.articles),
};

/**
 * A replay of the capture: each route answered with what it answered then — an article by the recording of its own
 * path, any list by the one list of its route the capture kept — and anything else with a 404.
 */
export const replayed = async (address: string): Promise<Reply> => {
  const at = routeAt(address);
  const kept =
    at === undefined ? undefined : RECORDINGS[at.route].find((each) => at.route !== 'article' || each.path === at.path);
  return kept === undefined ? reply(404, '{}') : reply(200, JSON.stringify(kept.answer));
};
