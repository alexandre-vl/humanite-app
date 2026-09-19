import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { SearchPage } from './search-page';

// The double is built inside the factory: jest hoists the call above everything else in the file, so anything it read
// from outside would still be undefined when the screen first asks for the router.
jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));

const PLACEHOLDER = 'Saisissez ici le sujet';

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <SearchPage />
    </QueryClientProvider>,
  );
};

/** One more turn, for the answer to land: a question still on its way when a test ends answers during the next one. */
const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

/**
 * Types into the field and lets the screen settle. Two turns are needed, not one: the first runs past the wait the
 * field keeps before asking anything, and the answer only reaches the screen on the next one. Measured — with a single
 * turn every assertion below about what is *not* on screen passed whether the screen had asked or not, which is to say
 * it held nothing at all.
 */
const type = async (text: string): Promise<void> => {
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), text);
  await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
  await settle();
};

// A list unmounted between two tests finishes its own work on the next turn: letting that turn run here keeps the
// update inside act, where React can account for it.
afterEach(settle);

describe('SearchPage', () => {
  /**
   * A single letter reaches all 72 articles of the corpus, so a screen that asked would answer with the whole paper.
   * Nothing is asked and nothing is counted: the count only appears once something has come back.
   */
  it('dit ce qu’elle cherche tant qu’on ne lui a rien demandé, au lieu de rester nue', async () => {
    await renderPage();
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await type('c');
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    expect(screen.queryByText(/résultats?/u)).toBeNull();
  });

  it('laisse le lecteur finir de taper avant d’interroger le journal', async () => {
    await renderPage();
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'climat');
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(screen.queryByText('Cherchez dans le journal')).toBeNull();
    await settle();
  });

  it('sert les articles qu’une question atteint, et dit combien elle en a trouvé', async () => {
    const found = await content.search({ text: 'climat' });
    const [first] = found.items;
    if (first === undefined || found.total < 2) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('climat');
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(screen.getByText(`${String(found.total)} résultats pour « climat »`)).toBeTruthy();
    await settle();
  });

  it('trouve un article accentué à partir de ce qu’un lecteur tape sans accent', async () => {
    const found = await content.search({ text: 'école' });
    const [first] = found.items;
    if (first === undefined) {
      throw new Error('le corpus ne porte aucun article sur ce sujet : le test ne vérifierait rien');
    }
    await renderPage();
    await type('ecole');
    expect(await screen.findByText(first.title)).toBeTruthy();
    await settle();
  });

  it('nomme la question à laquelle rien ne répond, plutôt que d’annoncer un journal vide', async () => {
    await renderPage();
    await type('zzzz');
    expect(await screen.findByText('Aucun résultat pour « zzzz »')).toBeTruthy();
    expect(screen.queryByText('Rien à lire pour l’instant')).toBeNull();
    await settle();
  });

  it('rend la question au lecteur quand il efface, et revient à ce qu’elle cherche', async () => {
    await renderPage();
    await type('climat');
    await fireEvent.press(screen.getByLabelText('Effacer la recherche'));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await settle();
  });

  it('ouvre l’article pressé sur sa propre route', async () => {
    const [first] = (await content.search({ text: 'climat' })).items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('climat');
    await fireEvent.press(await screen.findByText(first.title));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith({ pathname: '/article/[id]', params: { id: first.id } });
    await settle();
  });
});
