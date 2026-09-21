import { SECTION_ID } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { SectionPage } from './section-page';

/** What the route hands over, which each test sets before it renders. Jest hoists the mock above this declaration, so
 * the name has to start with `mock` for the factory to be allowed to read it. */
const mockRouteParams = { id: 'monde' };

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: (): typeof mockRouteParams => mockRouteParams,
  router: { replace: jest.fn(), back: jest.fn() },
}));

/**
 * The name the bar carries, or `null` while it carries none.
 *
 * It is found by the one thing only a bar says of its words — that they name the screen. The band of sections under
 * it prints the very same word, so a search for the text would find that one too and the test would pass on a screen
 * whose bar had never been named at all.
 */
const barTitle = (): unknown => {
  const bar = screen.queryByRole('header');
  if (bar === null) {
    return null;
  }
  const named: unknown = bar.props['children'];
  return named;
};

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <SectionPage />
    </QueryClientProvider>,
  );
};

/** One more turn, for what the screen asked on the turn before to reach it. */
const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('SectionPage', () => {
  it('sert les articles de la section que la route nomme', async () => {
    mockRouteParams.id = 'monde';
    const [first] = (await content.getFeed({ section: SECTION_ID.parse('monde') })).items;
    if (first === undefined) {
      throw new Error('le contenu ne sert aucun article de cette section : le test ne vérifierait rien');
    }
    await renderPage();
    // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one
    // keeps that update inside act.
    await settle();
    expect(await screen.findByText(first.title)).toBeTruthy();
  });

  it('dit qu’une section absente du sommaire est introuvable, au lieu de la servir vide', async () => {
    // Bien formé pour le contrat, qui ne valide que la forme d’un slug : c’est le sommaire qui tranche.
    mockRouteParams.id = 'pas-une-section-du-journal';
    await renderPage();
    await settle();
    expect(await screen.findByText('Rubrique introuvable')).toBeTruthy();
  });

  it('nomme la barre du nom que le sommaire donne à la rubrique, et de rien avant qu’il réponde', async () => {
    mockRouteParams.id = 'monde';
    const label = (await content.getSections()).find((one) => one.id === SECTION_ID.parse('monde'))?.label;
    if (label === undefined) {
      throw new Error('le sommaire ne porte pas cette rubrique : le test ne vérifierait rien');
    }
    await renderPage();
    expect(barTitle()).toBeNull();
    await settle();
    expect(barTitle()).toBe(label);
  });
});
