import type { ContentApi, ContentErrorCode } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import type { ContentSource } from '../config';
import { CONTENT_SOURCE } from '../config';
import type { Source } from './source';
import { SOURCE } from './source';

/**
 * The source a build bundled, once the build's own variable has named the same one.
 *
 * Which source a build reads is settled when Metro resolves `./source`: the corpus by default, the journal's service
 * in a build that asked for it. The variable says it a second time, for what keeps its data under the source's name —
 * the cache and the reader's shelf. The two are read from one environment when the bundle is made, so they disagree
 * only when the variable changed under a Metro still resolving for the other source; such a build stops here, rather
 * than keep one source's answers under the other's name.
 */
export const agreed = (bundled: Source, named: ContentSource): Source => {
  if (bundled.name !== named) {
    throw new RangeError(
      `EXPO_PUBLIC_CONTENT_SOURCE nomme « ${named} », et la build lit « ${bundled.name} » : relancer Metro pour la source nommée`,
    );
  }
  return bundled;
};

/**
 * The content the app reads, from the source the build bundled. Both speak the same contract, so no screen knows which
 * it reads. This module is the only door: a lint policy refuses both packages anywhere but this place.
 */
export const content: ContentApi = agreed(SOURCE, CONTENT_SOURCE).content;

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
 *
 * A connection that expired is the one refusal another try can answer differently, and the reason is not patience: by
 * the time that try leaves, the token it failed under has been forgotten, so the same request goes out as anybody's
 * and the source serves it what it serves anybody. The reader is signed out and reading, rather than looking at a
 * wall with nothing to press.
 */
const RETRYABLE = {
  'not-found': false,
  refused: false,
  expired: true,
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
