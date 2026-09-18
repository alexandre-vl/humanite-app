import type { ContentApi } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import { contentApi } from '@huma/mock-api';

/**
 * The content the app reads. A mock serves the fictional corpus from the bundle, with no network and no service; a
 * client of a real one would take its place here, behind the same contract, and no screen would change. This module is
 * the only door: a lint policy refuses the mock anywhere else.
 */
export const content: ContentApi = contentApi;

/**
 * Whether asking again could answer differently. An article the content does not have stays missing however often it is
 * asked for, so only a failure that may pass — a service unavailable, a read that timed out — is worth another try.
 */
export const isRetryable = (error: Error): boolean => error instanceof ContentApiError && error.code !== 'not-found';
