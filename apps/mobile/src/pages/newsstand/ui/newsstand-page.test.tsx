import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { NewsstandPage } from './newsstand-page';

jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <NewsstandPage />
    </QueryClientProvider>,
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('NewsstandPage', () => {
  it('range tous les numéros du journal, chacun avec ce qu’il contient', async () => {
    const shelf = await content.getIssues();
    expect(shelf.length).toBeGreaterThan(1);
    await renderPage();
    for (const issue of shelf) {
      expect(await screen.findByText(issue.opener.title)).toBeTruthy();
    }
    expect(screen.getAllByText(`${String(shelf[0]?.count ?? 0)} articles`)).toHaveLength(1);
  });

  /**
   * Every cover is a front page, so every cover carries the picture its numéro opened on. Without this the shelf could
   * stand four titles on four empty grounds and say nothing about it — the mock's own picture is a plain view here, so
   * it is the count of them that tells.
   */
  it('donne à chaque couverture la photo d’ouverture de son numéro', async () => {
    const shelf = await content.getIssues();
    await renderPage();
    await screen.findByText(shelf[0]?.opener.title ?? '');
    expect(screen.getAllByTestId('picture')).toHaveLength(shelf.length);
  });

  it('ouvre le numéro qu’on prend sur l’étagère', async () => {
    const shelf = await content.getIssues();
    const first = shelf[0];
    if (first === undefined) {
      throw new Error('le kiosque ne range aucun numéro : le test ne vérifierait rien');
    }
    await renderPage();
    await fireEvent.press(await screen.findByText(first.opener.title));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith({ pathname: '/issue/[id]', params: { id: first.id } });
  });
});
