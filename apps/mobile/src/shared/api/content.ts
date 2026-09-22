import type { ContentApi, ContentErrorCode } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import { contentApi } from '@huma/mock-api';

/**
 * The content the app reads. Today a mock serves the fictional corpus from the bundle, with no network and no service.
 * The journal's own service is already read by the contracts — its answers item by item, its bodies into blocks, its
 * pictures at the width of their place — and the client that asks it for them takes this line's place, behind the
 * same contract, without a screen changing. This module is the only door: a lint policy refuses the mock anywhere else.
 */
export const content: ContentApi = contentApi;

/**
 * Whether asking again could answer differently, code by code. An article the content does not have stays missing
 * however often it is asked for; a service unavailable and a read that timed out may both pass on the next try. The
 * table answers for every code the contract declares, so a code added there stops the build here rather than becoming
 * retryable by default — a wrong answer nothing would report.
 */
const RETRYABLE = {
  'not-found': false,
  unavailable: true,
  timeout: true,
} satisfies Readonly<Record<ContentErrorCode, boolean>>;

/** Whether asking again could answer differently, for an error of any origin. */
export const isRetryable = (error: Error): boolean => error instanceof ContentApiError && RETRYABLE[error.code];
