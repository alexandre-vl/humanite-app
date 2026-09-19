import { SECTION_ID } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { content } from '#api';
import { SectionPage } from './section-page';

/** What the route hands over, which each test sets before it renders. Jest hoists the mock above this declaration, so
 * the name has to start with `mock` for the factory to be allowed to read it. */
const mockRouteParams = { id: 'monde' };

jest.mock('expo-router', () => {
  const stackScreen = (): ReactNode => null;
  return {
    __esModule: true,
    useLocalSearchParams: (): typeof mockRouteParams => mockRouteParams,
    router: { replace: jest.fn() },
    Stack: { Screen: stackScreen },
  };
});

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <SectionPage />
    </QueryClientProvider>,
  );
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
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await screen.findByText(first.title)).toBeTruthy();
  });

  it('dit qu’une section absente du sommaire est introuvable, au lieu de la servir vide', async () => {
    // Bien formé pour le contrat, qui ne valide que la forme d’un slug : c’est le sommaire qui tranche.
    mockRouteParams.id = 'pas-une-section-du-journal';
    await renderPage();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await screen.findByText('Rubrique introuvable')).toBeTruthy();
  });
});
