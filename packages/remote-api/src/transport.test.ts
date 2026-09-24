import { expect, test } from 'vitest';
import { causeOf, HEADERS, isSendable } from './transport.ts';

test('a status names its cause, and one that answered names none', () => {
  expect([200, 204, 401, 403, 404, 410, 408, 429, 500, 503, 301, 400].map((status) => causeOf(status, false))).toEqual([
    undefined,
    undefined,
    'refused',
    'refused',
    'not-found',
    'not-found',
    'unavailable',
    'unavailable',
    'unavailable',
    'unavailable',
    'malformed',
    'malformed',
  ]);
});

/** OkHttp fails a request whose header carries any byte outside ASCII: a name with an accent would never be sent. */
test('every header the client sends is plain ASCII', () => {
  expect(Object.values(HEADERS).filter((value) => !isSendable(value))).toEqual([]);
});

/**
 * The one status that means two opposite things. Asked for by nobody, a refusal says the thing is kept for
 * subscribers; asked for under a reader's own token, it says the token is dead — and only the second is mended by the
 * reader doing something.
 */
test('a refusal under a reader’s own token is their connection expiring, not the thing being withheld', () => {
  expect([401, 403].map((status) => causeOf(status, true))).toEqual(['expired', 'expired']);
  expect([404, 503, 400].map((status) => causeOf(status, true))).toEqual(['not-found', 'unavailable', 'malformed']);
  expect(causeOf(200, true)).toBeUndefined();
});
