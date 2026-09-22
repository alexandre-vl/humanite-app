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
