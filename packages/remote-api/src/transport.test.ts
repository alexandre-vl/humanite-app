import { expect, test } from 'vitest';
import { causeOf, HEADERS, isSendable } from './transport.ts';

test('a status names its cause, and one that answered names none', () => {
  expect([200, 204, 401, 403, 404, 410, 408, 429, 500, 503, 301, 400].map(causeOf)).toEqual([
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
