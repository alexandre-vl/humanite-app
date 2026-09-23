import type { ArticleSummary, ContentApi, DisplayText, Page, PageQuery } from '@huma/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/**
 * A cache of its own for one rendering: nothing is kept once the test is done, and a failure shows at once rather than
 * after the retries a phone would make. Written once, so no screen's test drifts to retrying what another's shows.
 */
const freshCache = (): QueryClient => new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });

/** Renders `ui` over a cache of its own, as the app's own root would with nothing restored. */
export const renderWithCache = async (ui: ReactElement): Promise<void> => {
  await render(<QueryClientProvider client={freshCache()}>{ui}</QueryClientProvider>);
};

/**
 * One more turn of the timers, inside `act`. A virtualised list reports its first layout in an animation frame, which
 * jest runs as a timer, and an answer still on its way lands on the next turn: without it, the update arrives outside
 * `act` or after the test has read the screen.
 */
export const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

/** Every page of a list, read from its first to its last, and flattened. */
const everyPage = async (
  read: (query: PageQuery) => Promise<Page<ArticleSummary>>,
  cursor?: string,
): Promise<readonly ArticleSummary[]> => {
  const page = await read(cursor === undefined ? {} : { cursor });
  return page.nextCursor === null ? page.items : [...page.items, ...(await everyPage(read, page.nextCursor))];
};

/**
 * Every article a content serves, section by section and each section to its last page: the whole paper, as a test
 * looking for an article of some shape needs it. The front and the wire are not the paper — each holds only the newest.
 */
export const everyArticle = async (content: ContentApi): Promise<readonly ArticleSummary[]> => {
  const sections = await content.getSections();
  const lists = await Promise.all(
    sections.map(async (section) => everyPage(async (query) => content.getFeed({ ...query, section: section.id }))),
  );
  return lists.flat();
};

/**
 * The standfirst of an item a test chose to have one. An item may carry none, and a test that reads one off an item it
 * never checked would be reading nothing and finding it; this says which item broke the choice instead.
 */
export const standfirstOf = (summary: ArticleSummary): DisplayText => {
  if (summary.standfirst === undefined) {
    throw new Error(`${summary.id} n’a pas de chapô`);
  }
  return summary.standfirst;
};
