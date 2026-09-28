import { PICTURE } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { READER } from './reader';
import { SOURCE as CORPUS } from './source';
import { SOURCE } from './source.service';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SOURCE, variante de service', () => {
  /** The door hands the client the platform's own network, and speaks for no session: no cookie leaves with a request. */
  it('demande le service par le réseau de la plateforme, sans cookie et sous son propre nom', async () => {
    const asked = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    const wire = await SOURCE.content.getLiveFeed({});
    expect(wire).toEqual({ items: [], nextCursor: null });
    const [address, init] = asked.mock.calls[0] ?? [];
    expect(address).toBe('https://phenix2.immanens.com/api/v1/app/300/wordpress/homepage?language=fr&ano=1');
    expect(init).toMatchObject({
      credentials: 'omit',
      headers: { 'user-agent': 'humanite-lecteur (client non officiel)' },
    });
  });

  it('nomme hors ligne une requête que la plateforme n’a pas pu faire', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed: java.net.UnknownHostException'));
    await expect(SOURCE.content.getLiveFeed({})).rejects.toMatchObject({ code: 'offline' });
  });

  /** The build that bundles this variant carries no corpus, so a key the corpus draws draws nothing here. */
  it('ne dessine aucune image du corpus, et se nomme service', () => {
    const picture = PICTURE.parse({ kind: 'corpus', key: 'pol-a5-hero' });
    if (picture.kind !== 'corpus') {
      throw new Error('la clé ne se lit pas comme une image du corpus : le test ne vérifierait rien');
    }
    expect(CORPUS.corpusPicture(picture.key, 480)).not.toBeNull();
    expect(SOURCE.corpusPicture(picture.key, 480)).toBeNull();
    expect(SOURCE.name).toBe('service');
  });
  /**
   * The reader's token goes out with the request and `ano` comes off it: the two halves of asking the service as the
   * subscriber rather than as nobody. The port is asked at every request, the client being built long before a login.
   */
  it('demande le service sous le jeton de l’abonné, sans le drapeau « ano »', async () => {
    jest.spyOn(READER, 'token').mockReturnValue('jeton-de-labonne');
    const asked = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    await SOURCE.content.getLiveFeed({});
    const [address, init] = asked.mock.calls[0] ?? [];
    expect(address).toBe('https://phenix2.immanens.com/api/v1/app/300/wordpress/homepage?language=fr');
    expect(init).toMatchObject({ headers: { 'x-user-token': 'jeton-de-labonne' } });
  });

  /**
   * The whole of the fix, end to end: the service answers a request made under a reader's token with its successor,
   * in a header whose case is its own, and the reader takes it in place of the one that went out. Dropped, the token
   * a login earned is the one every request carries until it dies two hours later, and the subscriber is signed out
   * in the middle of reading — measured against the live service on 27/09/2026.
   */
  it('confie à l’abonné le jeton neuf que le service rend, quelle que soit la casse de l’en-tête', async () => {
    jest.spyOn(READER, 'token').mockReturnValue('jeton-de-labonne');
    const renewing = jest.spyOn(READER, 'renew').mockReturnValue(undefined);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { 'X-User-Token': 'jeton-suivant' },
      }),
    );
    await SOURCE.content.getLiveFeed({});
    expect(renewing).toHaveBeenCalledWith('jeton-de-labonne', 'jeton-suivant');
  });

  /** A token handed to a request that carried none is a token no login of this reader earned (ADR-0033, R4). */
  it('ne confie rien quand la requête ne portait aucun jeton', async () => {
    jest.spyOn(READER, 'token').mockReturnValue(undefined);
    const renewing = jest.spyOn(READER, 'renew').mockReturnValue(undefined);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { 'x-user-token': 'jeton-de-personne' },
      }),
    );
    await SOURCE.content.getLiveFeed({});
    expect(renewing).not.toHaveBeenCalled();
  });
});
