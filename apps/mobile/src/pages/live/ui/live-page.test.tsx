import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { LivePage } from './live-page';

describe('LivePage', () => {
  it('affiche son titre au-dessus du fil', async () => {
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <LivePage />
      </QueryClientProvider>,
    );
    // A virtualised list reports its first layout after the render returns; flushing keeps that update inside act.
    await act(async () => Promise.resolve());
    expect(await screen.findByText('En continu')).toBeTruthy();
  });
});
