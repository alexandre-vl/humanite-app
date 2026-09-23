import { ContentApiError } from '@huma/contracts';
import type { ContentApi } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';
import { createRemoteApi } from '@huma/remote-api';
import { judgeTransport } from '@huma/remote-api/judge';
import type { Make, TransportCode } from '@huma/remote-api/judge';

const define = fixtureFactory<TransportCode>();

/**
 * Clients of the journal's service, each with one thing done wrong, judged by the package's own judging.
 *
 * The judging is real and the clients are the real one with one of its ports bent, for the reason given everywhere on
 * this bench: handed the real client, a judging can only say it is in order, and the package's own test says that.
 * Each bent client is one a hurried change could plausibly write — drop the deadline, keep the timer and forget what
 * it was for, let a request go without letting its connection go, report every failure alike, borrow the official
 * client's name to be let in, ask a list without the slash its path takes.
 */
const judged = (make: Make) => async (): Promise<readonly TransportCode[]> =>
  (await judgeTransport(make)).map((finding) => finding.code);

/** A read whose failure is reported as the service being unavailable, whatever made it fail. */
const mislabelled = async <Value>(read: Promise<Value>): Promise<Value> => {
  try {
    return await read;
  } catch {
    throw new ContentApiError('unavailable', 'le service ne répond pas');
  }
};

/** A client that names every failure alike: the reader is told the service is down when it is not the service. */
const sayingOneThing = (api: ContentApi): ContentApi => ({
  getSections: async () => mislabelled(api.getSections()),
  getFeed: async (query) => mislabelled(api.getFeed(query)),
  getLiveFeed: async (query) => mislabelled(api.getLiveFeed(query)),
  getArticle: async (id) => mislabelled(api.getArticle(id)),
  search: async (query) => mislabelled(api.search(query)),
});

export const TRANSPORT_FIXTURES = [
  define('transport/client', 'le client du service, tel qu’il demande', [], judged(createRemoteApi)),
  define(
    'transport/no-deadline',
    'un client qui ne pose aucun délai à ses requêtes',
    ['transport/no-deadline'],
    judged((client) => createRemoteApi({ ...client, after: () => () => undefined })),
  ),
  define(
    'transport/hangs',
    'un client dont le délai passe sans que rien ne se passe',
    ['transport/hangs', 'transport/connection-held'],
    judged((client) => createRemoteApi({ ...client, after: (delay) => client.after(delay, () => undefined) })),
  ),
  define(
    'transport/connection-held',
    'un client qui abandonne une requête sans lâcher sa connexion',
    ['transport/connection-held'],
    judged((client) =>
      createRemoteApi({
        ...client,
        abortable: () => ({ signal: client.abortable().signal, abort: () => undefined }),
      }),
    ),
  ),
  define(
    'transport/cause-misnamed',
    'un client qui dit « indisponible » de tout échec, quelle qu’en soit la cause',
    ['transport/cause-misnamed'],
    judged((client) => sayingOneThing(createRemoteApi(client))),
  ),
  define(
    'transport/impersonates',
    'un client qui prend le nom du client officiel pour se faire servir',
    ['transport/impersonates'],
    judged((client) =>
      createRemoteApi({
        ...client,
        fetch: async (address, init) =>
          client.fetch(address, {
            ...init,
            headers: { ...init.headers, 'user-agent': 'com.immanens.hybride.app.ios.300' },
          }),
      }),
    ),
  ),
  define(
    'transport/address-unknown',
    'un client qui demande la liste d’une rubrique sans la barre de son chemin',
    ['transport/address-unknown'],
    judged((client) =>
      createRemoteApi({
        ...client,
        fetch: async (address, init) => client.fetch(address.replace('/posts/', '/posts'), init),
      }),
    ),
  ),
];
