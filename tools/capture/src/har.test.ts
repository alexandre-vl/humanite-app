import { expect, test } from 'vitest';
import { readHar } from './har.ts';

/** A capture of two exchanges, as a proxy writes one: the second answer encoded, and braces inside its strings. */
const CAPTURE = JSON.stringify({
  log: {
    entries: [
      {
        startedDateTime: '2026-09-21T20:55:00.000Z',
        request: {
          method: 'GET',
          url: 'https://phenix2.immanens.com/api/v1/app/300/wordpress/home?&language=fr&ano=1',
        },
        response: { status: 200, content: { mimeType: 'application/json; charset=utf-8', text: '{"posts":[]}' } },
      },
      {
        startedDateTime: '2026-09-21T20:55:01.000Z',
        request: {
          method: 'POST',
          url: 'https://phenix2.immanens.com/api/v1/app/300/user/login',
          postData: { text: '{"a":"{ pas une accolade }"}' },
        },
        response: {
          status: 401,
          content: {
            mimeType: 'application/json',
            encoding: 'base64',
            text: Buffer.from('{"error":{}}').toString('base64'),
          },
        },
      },
    ],
  },
});

test('a capture is read exchange by exchange, in the order it recorded them', () => {
  const [first, second] = readHar(CAPTURE);
  expect(first).toMatchObject({
    method: 'GET',
    host: 'phenix2.immanens.com',
    path: '/api/v1/app/300/wordpress/home',
    query: '?&language=fr&ano=1',
    status: 200,
    mime: 'application/json',
    responseBody: '{"posts":[]}',
  });
  expect(second).toMatchObject({ method: 'POST', status: 401, requestBody: '{"a":"{ pas une accolade }"}' });
});

test('an answer written in base64 is read as the text it encodes', () => {
  expect(readHar(CAPTURE)[1]?.responseBody).toBe('{"error":{}}');
});

test('a file that holds no entries is refused as no capture at all', () => {
  expect(() => readHar('{"log":{}}')).toThrow(/entries/u);
});
