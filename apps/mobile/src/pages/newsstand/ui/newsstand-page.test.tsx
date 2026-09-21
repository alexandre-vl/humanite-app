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
   * A cover is drawn as a front page, so left to compose itself it reads the paper's name before every numéro — four
   * times on a shelf of four — and then a date, a headline and a count as four stops. Named, it is one: which numéro
   * this is, what it opens on, and how much is in it, which is what a reader takes a paper off a shelf for.
   */
  it('dit chaque numéro en une phrase, et non le nom du journal quatre fois', async () => {
    const shelf = await content.getIssues();
    const first = shelf[0];
    if (first === undefined) {
      throw new Error('l’étagère est vide : le test ne vérifierait rien');
    }
    await renderPage();
    const covers = await screen.findAllByRole('link', { name: /^Numéro du/u });
    expect(covers).toHaveLength(shelf.length);
    expect(covers[0]?.props['accessibilityLabel']).toBe(
      `Numéro du 13 septembre : ${first.opener.title}. ${String(first.count)} articles.`,
    );
    // The paper's name is painted on every cover and read out on none: the shelf is one paper, said once at the top.
    expect(screen.queryAllByLabelText('Humanité')).toHaveLength(0);
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
    // Hidden ones count: a cover's picture is passed over by a screen reader, the title over it having already said
    // what the numéro opens on.
    expect(screen.getAllByTestId('picture', { includeHiddenElements: true })).toHaveLength(shelf.length);
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
