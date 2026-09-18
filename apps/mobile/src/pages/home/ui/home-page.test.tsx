import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { StartupProvider } from '#lib/startup';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders the masthead and the section bar', async () => {
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <StartupProvider>
          <HomePage />
        </StartupProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Humanité')).toBeTruthy();
    expect(screen.getByText('À la une')).toBeTruthy();
  });
});
