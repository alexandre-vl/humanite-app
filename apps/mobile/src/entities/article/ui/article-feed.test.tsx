import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { feedQuery } from '../api/queries';
import { ArticleFeed } from './article-feed';

describe('ArticleFeed', () => {
  it('affiche les articles que le contenu sert', async () => {
    const [first] = (await content.getFeed({})).items;
    if (first === undefined) {
      throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
    }
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <ArticleFeed query={feedQuery} />
      </QueryClientProvider>,
    );
    // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one
    // keeps that update inside act.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(await screen.findByText(first.standfirst)).toBeTruthy();
  });
});
