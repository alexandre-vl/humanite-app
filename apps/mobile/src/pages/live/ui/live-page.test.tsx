import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { LivePage } from './live-page';

describe('LivePage', () => {
  it('affiche le libellé de la rubrique', async () => {
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <LivePage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('En continu')).toBeTruthy();
  });
});
