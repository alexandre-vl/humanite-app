import { queryOptions } from '@tanstack/react-query';
import { content } from '#api';

/** The root every section key starts with: one namespace in the cache the app persists. */
const SECTIONS = 'sections';

/**
 * Every section the newsroom publishes, which the bar shows in the order they carry. It is drawn from the cache at
 * once and read again once stale, like any other reading.
 *
 * It was kept for good, in a cache that lasts a day. A menu the newsroom changed overnight was still the bar's the next
 * morning, while the client finds a section's list through the menu it has read itself since the app started: a
 * section dropped from one and kept in the other opened on a failure that said it was not there.
 */
export const sectionsQuery = queryOptions({
  queryKey: [SECTIONS],
  queryFn: async () => content.getSections(),
});
