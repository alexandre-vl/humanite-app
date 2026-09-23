import type { ContentApi, ContentErrorCode } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import { contentApi } from '@huma/mock-api';
import { createRemoteApi } from '@huma/remote-api';
import { CONTENT_SOURCE } from '../config';
import { noteSetAside } from './set-aside';

/**
 * The journal's service, asked through the platform's own network: its `fetch`, its abort and its timers, which the
 * client is handed rather than reaching for. Cookies are left out — the service sets none the app needs, and a request
 * that sent one would speak for a session this app never opened.
 */
export const serviceContent = (): ContentApi =>
  createRemoteApi<AbortSignal>({
    fetch: async (address, init) => {
      const reply = await fetch(address, { headers: init.headers, signal: init.signal, credentials: 'omit' });
      return { status: reply.status, text: async () => reply.text() };
    },
    abortable: () => new AbortController(),
    after: (delay, then) => {
      const timer = setTimeout(then, delay);
      return () => {
        clearTimeout(timer);
      };
    },
    setAside: noteSetAside,
  });

/**
 * The content the app reads: the corpus it carries, or the journal's service, as the build chose. Both speak the same
 * contract, so no screen knows which it reads. This module is the only door: a lint policy refuses both packages
 * anywhere else.
 */
export const content: ContentApi = CONTENT_SOURCE === 'service' ? serviceContent() : contentApi;

/**
 * Whether the source shelves numéros, and so whether the app has a newsstand. It is the source's to say, by having the
 * method or not, and it is read once: the source is chosen when the app is built.
 */
export const hasShelf = content.getIssues !== undefined;

/**
 * Whether asking again could answer differently, cause by cause. What the source does not have stays missing however
 * often it is asked for, what it refuses this reader it refuses again, and an answer no reading could make sense of is
 * the same answer next time; a request that never reached the source, one it did not answer in time, and one it could
 * not serve may each pass on the next try. The table answers for every code the contract declares, so a code added
 * there stops the build here rather than becoming retryable by default — a wrong answer nothing would report.
 */
const RETRYABLE = {
  'not-found': false,
  refused: false,
  offline: true,
  timeout: true,
  unavailable: true,
  malformed: false,
} satisfies Readonly<Record<ContentErrorCode, boolean>>;

/**
 * The cause a failed read names, for an error of any origin. One the content raised names its own; anything else is a
 * read that could not be made into an answer, which is what `malformed` says.
 */
export const failureOf = (error: Error | null): ContentErrorCode =>
  error instanceof ContentApiError ? error.code : 'malformed';

/** Whether asking again could answer differently, for a failure named by its cause. */
export const canRetry = (failure: ContentErrorCode): boolean => RETRYABLE[failure];

/** Whether asking again could answer differently, for an error of any origin. */
export const isRetryable = (error: Error): boolean => canRetry(failureOf(error));
