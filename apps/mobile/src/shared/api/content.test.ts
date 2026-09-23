import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { serviceContent } from './content';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('serviceContent', () => {
  /** The door hands the client the platform's own network, and speaks for no session: no cookie leaves with a request. */
  it('demande le service par le réseau de la plateforme, sans cookie et sous son propre nom', async () => {
    const asked = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
    const wire = await serviceContent().getLiveFeed({});
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
    await expect(serviceContent().getLiveFeed({})).rejects.toMatchObject({ code: 'offline' });
  });
});
