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

/** Whether an address asks the service for one article: the one route a bent client below is bent on alone. */
const isArticle = (address: string): boolean => address.includes('/wordpress/post/');

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
  define(
    'transport/borrows-key',
    'un client qui se fait reconnaître en frappant le jeton anonyme du client officiel',
    ['transport/impersonates', 'transport/address-unknown'],
    judged((client) =>
      createRemoteApi({
        ...client,
        fetch: async (address, init) => {
          // The shape the gate tempts a hurried change into: mint the anonymous token the official client mints from
          // its own key, then carry it. Two things go wrong at once, and the judging names both — an address no
          // capture holds an answer for, and a request speaking under someone else's token.
          await client.fetch(address.replace(/\/wordpress\/.*$/u, '/anonymous-token'), init);
          return client.fetch(address, {
            ...init,
            headers: { ...init.headers, 'x-anonymous-token': 'jeton-emprunte' },
          });
        },
      }),
    ),
  ),
  define(
    'transport/reader-unnamed',
    'un client qui laisse au vestiaire le jeton que la connexion de l’abonné a gagné',
    ['transport/reader-unnamed'],
    judged((client) => createRemoteApi({ ...client, token: () => undefined })),
  ),
  define(
    'transport/ano-kept',
    'un client qui porte le jeton de l’abonné et dit dans la même requête que personne n’est connecté',
    ['transport/reader-unnamed'],
    judged((client) =>
      createRemoteApi({
        ...client,
        // The shape a change that only added the header would leave: the token goes out, and `ano` — the flag the
        // official client sends exactly when it sends no token — goes out with it. The service is told both.
        fetch: async (address, init) => client.fetch(address.includes('ano=') ? address : `${address}&ano=1`, init),
      }),
    ),
  ),
  define(
    'transport/invents-token',
    'un client qui porte un jeton d’usager qu’aucune connexion n’a gagné',
    ['transport/impersonates'],
    judged((client) => createRemoteApi({ ...client, token: () => 'jeton-invente' })),
  ),
  define(
    'transport/no-deadline-article',
    'un client qui demande un article par un second client, bâti sans délai',
    ['transport/no-deadline'],
    judged((client) => ({
      ...createRemoteApi(client),
      getArticle: createRemoteApi({ ...client, after: () => () => undefined }).getArticle,
    })),
  ),
  define(
    'transport/cause-misnamed-article',
    'un client qui dit « indisponible » de tout échec d’un article',
    ['transport/cause-misnamed'],
    judged((client) => {
      const api = createRemoteApi(client);
      return { ...api, getArticle: async (id) => mislabelled(api.getArticle(id)) };
    }),
  ),
  define(
    'transport/impersonates-article',
    'un client qui ne pose un témoin de connexion que sur la demande d’un article',
    ['transport/impersonates'],
    judged((client) =>
      createRemoteApi({
        ...client,
        fetch: async (address, init) =>
          client.fetch(
            address,
            isArticle(address) ? { ...init, headers: { ...init.headers, cookie: 'session=inventee' } } : init,
          ),
      }),
    ),
  ),
];
