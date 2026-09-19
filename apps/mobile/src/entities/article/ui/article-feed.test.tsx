import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { feedQuery } from '../api/queries';
import { ArticleFeed } from './article-feed';

const mounted = async (onOpen: (id: string) => void): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
      <ArticleFeed query={feedQuery} onOpen={onOpen} />
    </QueryClientProvider>,
  );
  // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one
  // keeps that update inside act.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('ArticleFeed', () => {
  it('affiche les articles que le contenu sert', async () => {
    const [first] = (await content.getFeed({})).items;
    if (first === undefined) {
      throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
    }
    await mounted(() => undefined);
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(await screen.findByText(first.standfirst)).toBeTruthy();
  });

  it('rapporte l’article pressé, sans naviguer lui-même', async () => {
    const [first] = (await content.getFeed({})).items;
    if (first === undefined) {
      throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
    }
    const open = jest.fn();
    await mounted(open);
    await fireEvent.press(await screen.findByText(first.title));
    expect(open).toHaveBeenCalledWith(first.id);
  });
});
