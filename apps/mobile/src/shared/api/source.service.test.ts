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
});
