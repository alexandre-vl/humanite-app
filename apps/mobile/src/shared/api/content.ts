import type { ContentApi } from '@huma/contracts';
import { contentApi } from '@huma/mock-api';

/**
 * The content the app reads. A mock serves the fictional corpus from the bundle, with no network and no service; a
 * client of a real one would take its place here, behind the same contract, and no screen would change. This module is
 * the only door: a lint policy refuses the mock anywhere else.
 */
export const content: ContentApi = contentApi;
