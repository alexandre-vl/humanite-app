import { SECTION_ID } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { content } from '#api';
import { SectionPage } from './section-page';

/** What the route hands over, which each test sets before it renders. Jest hoists the mock above this declaration, so
 * the name has to start with `mock` for the factory to be allowed to read it. */
const mockRouteParams = { id: 'monde' };

/** Every title the screen has handed the navigator, in the order it did: the first is what the header shows at once. */
const mockScreenTitles: string[] = [];

jest.mock('expo-router', () => {
  const stackScreen = ({ options }: Readonly<{ options: Readonly<{ title: string }> }>): ReactNode => {
    mockScreenTitles.push(options.title);
    return null;
  };
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

/** One more turn, for what the screen asked on the turn before to reach it. */
const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('SectionPage', () => {
  beforeEach(() => {
    mockScreenTitles.splice(0);
  });

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

  it('nomme l’en-tête dès la première image, vide plutôt que le segment de la route', async () => {
    mockRouteParams.id = 'monde';
    const label = (await content.getSections()).find((one) => one.id === SECTION_ID.parse('monde'))?.label;
    if (label === undefined) {
      throw new Error('le sommaire ne porte pas cette rubrique : le test ne vérifierait rien');
    }
    await renderPage();
    expect(mockScreenTitles[0]).toBe('');
    await settle();
    expect(mockScreenTitles.at(-1)).toBe(label);
  });
});
