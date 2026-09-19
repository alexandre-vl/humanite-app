import { describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { formatDateTime, formatDayLabel } from '#lib/format';
import { LivePage } from './live-page';

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <LivePage />
    </QueryClientProvider>,
  );
  // A virtualised list reports its first layout in an animation frame, which jest runs as a timer: flushing one keeps
  // that update inside act.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

describe('LivePage', () => {
  it('coiffe le fil de la journée que ses items portent', async () => {
    const [newest] = (await content.getLiveFeed({})).items;
    if (newest === undefined) {
      throw new Error('le contenu ne sert aucun item : le test ne vérifierait rien');
    }
    await renderPage();
    expect(await screen.findByText(formatDayLabel(newest.publishedAt))).toBeTruthy();
  });

  it('donne à chaque item son heure et son titre, l’ouverture mise à part', async () => {
    const { items } = await content.getLiveFeed({});
    const listed = items.find((item) => item.hero === undefined);
    if (listed === undefined) {
      throw new Error('le contenu ne sert aucun item sans illustration : le test ne vérifierait rien');
    }
    await renderPage();
    expect(await screen.findByText(listed.title)).toBeTruthy();
    expect(await screen.findByText(formatDateTime(listed.publishedAt))).toBeTruthy();
  });
});
