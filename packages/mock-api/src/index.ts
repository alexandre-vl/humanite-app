import { createContentApi } from './api.ts';

export { createContentApi } from './api.ts';
export type { MockApiOptions } from './api.ts';

/** The default content api, backed by the fictional corpus with no latency. */
export const contentApi = createContentApi();
