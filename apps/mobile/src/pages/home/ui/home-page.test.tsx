import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { StartupProvider } from '#lib/startup';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders the masthead and the section bar', async () => {
    const [first] = await content.getSections();
    if (first === undefined) {
      throw new Error('le contenu ne sert aucune section : le test ne vérifierait rien');
    }
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <StartupProvider>
          <HomePage />
        </StartupProvider>
      </QueryClientProvider>,
    );
    // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one
    // keeps that update inside act.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await screen.findByText('Humanité')).toBeTruthy();
    expect(await screen.findByText(first.label)).toBeTruthy();
  });
});
