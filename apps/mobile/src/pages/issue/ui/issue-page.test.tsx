import { ISSUE_ID } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { IssuePage } from './issue-page';

/** What the route hands over, which each test sets before it renders. The name starts with `mock` so the hoisted
 * factory below is allowed to read it. */
const mockRouteParams = { id: '2026-09-11' };

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: (): typeof mockRouteParams => mockRouteParams,
  router: { push: jest.fn(), back: jest.fn() },
}));

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <IssuePage />
    </QueryClientProvider>,
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('IssuePage', () => {
  beforeEach(() => {
    mockRouteParams.id = '2026-09-11';
  });

  /**
   * Read on the numéro of the 13th, and not on another: it is the one whose running order does not already open on a
   * picture — its first two pieces are briefs — so a rhythm that hoisted what it opens on would move something here,
   * where on the three other days it would move nothing and the test would pass having proved nothing. Measured:
   * the first illustrated item sits at rank 2 there, and at rank 0 on the 10th, 11th and 12th.
   */
  it('sert le sommaire du numéro que la route nomme, dans l’ordre du journal', async () => {
    mockRouteParams.id = '2026-09-13';
    const items = await content.getIssue(ISSUE_ID.parse('2026-09-13'));
    const [first] = items;
    if (first === undefined) {
      throw new Error('ce numéro ne porte aucun article : le test ne vérifierait rien');
    }
    await renderPage();
    expect(await screen.findByText(first.title)).toBeTruthy();
    // Where each title stands in the tree the screen rendered, which is the order a reader meets them in — a set of
    // titles read off the data would come back in the data's own order whatever the screen did with them.
    const printed = JSON.stringify(screen.toJSON());
    const places = items.map((item) => printed.indexOf(item.title)).filter((at) => at >= 0);
    expect(places.length).toBeGreaterThan(2);
    expect(places).toEqual([...places].sort((left, right) => left - right));
  });

  it('nomme la barre du jour que le numéro porte', async () => {
    await renderPage();
    // The day in full is written nowhere else on this screen: the cards under it carry `11/09/2026`.
    expect(await screen.findByText('vendredi 11 septembre')).toBeTruthy();
  });

  it('dit qu’un jour que le journal n’a jamais imprimé est introuvable', async () => {
    // Bien formé pour le contrat, qui ne valide que la forme d’une date : c’est l’étagère qui tranche.
    mockRouteParams.id = '1998-07-12';
    await renderPage();
    expect(await screen.findByText('Numéro introuvable')).toBeTruthy();
  });
});
