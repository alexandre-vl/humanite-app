import { expect, test } from 'vitest';
import { reply } from './bench.ts';
import { createSession, SessionError } from './session.ts';
import type { Credentials, Identity, Posting } from './session.ts';

/** A test identity: fake through and through, so no secret-shaped value ever sits in a tracked file. */
const IDENTITY: Identity = {
  appId: 300,
  appSecret: 'secret-for-the-test',
  device: { description: 'un téléphone', os: 'TestOS 1', token: { crypt_mode: 'jdly', crypt_value: 'deadbeef' } },
};

const CREDENTIALS: Credentials = { login: 'reader@example.org', password: 'a-password' };

type Sent = Readonly<{ address: string; headers: Readonly<Record<string, string>>; body: string }>;

/** A `Posting` that answers a queue of replies in order and keeps what it was sent, so a test can read both. */
const posting = (
  replies: readonly Readonly<{ status: number; body: string }>[],
): Posting & Readonly<{ sent: Sent[] }> => {
  const queue = [...replies];
  const sent: Sent[] = [];
  return {
    sent,
    post: async (address, headers, body) => {
      sent.push({ address, headers, body });
      const next = queue.shift();
      if (next === undefined) {
        throw new Error(`la sonde a posté ${address} sans réponse en réserve`);
      }
      return reply(next.status, next.body);
    },
  };
};

test('open asks the two exchanges in order and answers the user token', async () => {
  const ports = posting([
    { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-123' }) },
    { status: 200, body: JSON.stringify({ x_user_token: 'user-456' }) },
  ]);
  const token = await createSession(IDENTITY, ports).open(CREDENTIALS);
  expect(token).toBe('user-456');
  expect(ports.sent.map((each) => each.address)).toEqual([
    'https://phenix2.immanens.com/api/v1/app/300/anonymous-token',
    'https://phenix2.immanens.com/api/v1/app/300/user/login',
  ]);
  expect(JSON.parse(ports.sent[0]?.body ?? '')).toEqual({
    app_id: 300,
    app_secret: 'secret-for-the-test',
    device_auth: {
      description: 'un téléphone',
      os: 'TestOS 1',
      token: { crypt_mode: 'jdly', crypt_value: 'deadbeef' },
    },
  });
  expect(ports.sent[1]?.headers['x-anonymous-token']).toBe('anon-123');
  expect(JSON.parse(ports.sent[1]?.body ?? '')).toEqual({ login: 'reader@example.org', password: 'a-password' });
});

test('a login the service refuses raises SessionError refused, with the service message', async () => {
  const ports = posting([
    { status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-123' }) },
    { status: 401, body: JSON.stringify({ error: { code: 10053, message: 'Customer login failed' } }) },
  ]);
  const failed: unknown = await createSession(IDENTITY, ports)
    .open(CREDENTIALS)
    .catch((reason: unknown) => reason);
  expect(failed).toBeInstanceOf(SessionError);
  if (!(failed instanceof SessionError)) {
    throw new Error('attendu une SessionError');
  }
  expect(failed.code).toBe('refused');
  expect(failed.message).toBe('Customer login failed');
});

test('a service answer no reading can make sense of raises SessionError malformed', async () => {
  const ports = posting([{ status: 200, body: '<html>not json</html>' }]);
  const failed: unknown = await createSession(IDENTITY, ports)
    .anonymousToken()
    .catch((reason: unknown) => reason);
  expect(failed).toBeInstanceOf(SessionError);
  if (!(failed instanceof SessionError)) {
    throw new Error('attendu une SessionError');
  }
  expect(failed.code).toBe('malformed');
});

test('a service that will not answer raises SessionError unavailable', async () => {
  const ports = posting([{ status: 503, body: 'Service Unavailable' }]);
  const failed: unknown = await createSession(IDENTITY, ports)
    .anonymousToken()
    .catch((reason: unknown) => reason);
  expect(failed).toBeInstanceOf(SessionError);
  if (!(failed instanceof SessionError)) {
    throw new Error('attendu une SessionError');
  }
  expect(failed.code).toBe('unavailable');
});
