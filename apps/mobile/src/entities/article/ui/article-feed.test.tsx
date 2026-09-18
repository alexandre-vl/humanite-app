import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { feedQuery } from '../api/queries';
import { ArticleFeed } from './article-feed';

describe('ArticleFeed', () => {
  it('affiche les articles que le contenu sert', async () => {
    const page = await content.getFeed({});
    const first = page.items[0];
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <ArticleFeed query={feedQuery} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(first?.title ?? '')).toBeTruthy();
    expect(await screen.findByText(first?.standfirst ?? '')).toBeTruthy();
  });
});
