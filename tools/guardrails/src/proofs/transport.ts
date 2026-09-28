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

/** A read whose expired connection is reported as the thing simply being withheld. */
const asRefusal = async <Value>(read: Promise<Value>): Promise<Value> => {
  try {
    return await read;
  } catch (error) {
    if (error instanceof ContentApiError && error.code === 'expired') {
      throw new ContentApiError('refused', 'réservé aux abonnés');
    }
    throw error;
  }
};

/**
 * A client that reads a dead token as a wall.
 *
 * It is the reading the status alone invites: 403 is 403, and a client that never asked what the request carried
 * cannot tell a subscriber whose connection expired from a passer-by who was never entitled. The first is owed a way
 * back in; this client shows them a sales pitch instead.
 */
const readingExpiryAsWall = (api: ContentApi): ContentApi => ({
  getSections: async () => asRefusal(api.getSections()),
  getFeed: async (query) => asRefusal(api.getFeed(query)),
  getLiveFeed: async (query) => asRefusal(api.getLiveFeed(query)),
  getArticle: async (id) => asRefusal(api.getArticle(id)),
  search: async (query) => asRefusal(api.search(query)),
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
    // Deux fautes, et la seconde suit de la première : qui ne nomme aucune cause ne nomme pas non plus celle d’une
    // connexion expirée, et l’abonné dont le jeton est mort s’entend dire que le journal ne répond pas.
    ['transport/cause-misnamed', 'transport/expiry-misread'],
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
    // Et il ne peut pas davantage voir un jeton mourir : sa requête ne portant rien, le refus qu’elle reçoit est
    // celui qu’on fait à personne, ce qui est justement ce que le service répond à qui ne présente rien.
    ['transport/reader-unnamed', 'transport/expiry-misread'],
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
    'transport/expiry-misread',
    'un client qui lit le jeton mort d’un abonné comme un article qu’on lui refuse',
    ['transport/expiry-misread'],
    judged((client) => readingExpiryAsWall(createRemoteApi(client))),
  ),
  define(
    'transport/invents-token',
    'un client qui porte un jeton d’usager qu’aucune connexion n’a gagné',
    // Le jeton inventé part aussi quand personne n’est connecté, si bien qu’un refus fait à personne se lit comme une
    // connexion expirée : le juge nomme les deux, l’emprunt d’identité et la cause qui s’en trouve fausse. Et le jeton
    // neuf que le service rend à ce jeton inventé est pris à son tour, par un lecteur qu’aucune connexion n’a ouvert.
    ['transport/impersonates', 'transport/cause-misnamed', 'transport/renewal-unearned'],
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
    ['transport/cause-misnamed', 'transport/expiry-misread'],
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
  define(
    'transport/renewal-dropped',
    'un client qui laisse au service le jeton neuf qu’il rend à l’abonné',
    ['transport/renewal-dropped'],
    judged((client) => createRemoteApi({ ...client, renew: () => undefined })),
  ),
  define(
    'transport/renewal-unearned',
    'un client qui prend le jeton neuf d’une réponse, que la requête ait porté un jeton ou non',
    ['transport/renewal-unearned'],
    judged((client) =>
      createRemoteApi({
        ...client,
        // The shape a change that read the header in the platform's port would leave: whatever a reply hands back is
        // taken, whoever the request was asked as — nobody included, who is then signed in by no login at all.
        fetch: async (address, init) => {
          const answered = await client.fetch(address, init);
          const handed = answered.header('x-user-token');
          if (handed !== null) {
            client.renew(init.headers['x-user-token'] ?? '', handed);
          }
          return answered;
        },
      }),
    ),
  ),
];
