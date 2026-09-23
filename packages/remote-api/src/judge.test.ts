import { expect, test } from 'vitest';
import { createRemoteApi } from './api.ts';
import { judgeTransport } from './judge.ts';

/** The judging holds a client to the rules; this is the client the app is given, held to them. */
test('the client of this package ends every request, names every failure, speaks for itself, and asks what was asked', async () => {
  expect(await judgeTransport(createRemoteApi)).toEqual([]);
});
