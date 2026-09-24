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

/** The deadline as a test drives it: nothing fires unless the test fires it, and a request is told when it is let go. */
type Driven = Posting<number> & Readonly<{ sent: Sent[]; timers: (() => void)[]; aborted: () => boolean }>;

/** A `Posting` that answers a queue of replies in order and keeps what it was sent, so a test can read both. */
const posting = (replies: readonly Readonly<{ status: number; body: string }>[]): Driven => {
  const queue = [...replies];
  const sent: Sent[] = [];
  const timers: (() => void)[] = [];
  let letGo = false;
  return {
    sent,
    timers,
    aborted: () => letGo,
    abortable: () => ({
      signal: 0,
      abort: () => {
        letGo = true;
      },
    }),
    after: (...[, then]) => {
      timers.push(then);
      return () => {
        const at = timers.indexOf(then);
        if (at >= 0) {
          timers.splice(at, 1);
        }
      };
    },
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

/** A `Posting` whose service never answers at all, so only the deadline can end anything. */
const silent = (): Driven => {
  const ports = posting([]);
  return { ...ports, post: async () => new Promise<never>(() => undefined) };
};

/** The error a promise failed with, read without an assertion narrowing it. */
const failedWith = async (work: Promise<unknown>): Promise<SessionError> => {
  const reason: unknown = await work.catch((raised: unknown) => raised);
  if (!(reason instanceof SessionError)) {
    throw new Error('attendu une SessionError');
  }
  return reason;
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
  const failed = await failedWith(createSession(IDENTITY, ports).open(CREDENTIALS));
  expect(failed.code).toBe('refused');
  expect(failed.message).toBe('Customer login failed');
});

test('a service answer no reading can make sense of raises SessionError malformed', async () => {
  const failed = await failedWith(
    createSession(IDENTITY, posting([{ status: 200, body: '<html>not json</html>' }])).anonymousToken(),
  );
  expect(failed.code).toBe('malformed');
});

test('a service that will not answer raises SessionError unavailable', async () => {
  const failed = await failedWith(
    createSession(IDENTITY, posting([{ status: 503, body: 'Service Unavailable' }])).anonymousToken(),
  );
  expect(failed.code).toBe('unavailable');
});

/**
 * The failure that stranded a reader: a network that takes a request and never answers. The platform bounds nothing,
 * so without a deadline of its own the promise never settles, and a screen waiting on it waits for the life of the
 * app — with the one button that could sign the reader in saying it is already trying.
 */
test('a service that takes a login and never answers is let go on the deadline', async () => {
  const ports = silent();
  const opened = failedWith(createSession(IDENTITY, ports).open(CREDENTIALS));
  expect(ports.timers).toHaveLength(1);
  for (const fire of [...ports.timers]) {
    fire();
  }
  expect((await opened).code).toBe('unavailable');
  expect(ports.aborted()).toBe(true);
});

/** A request the platform refused to make is the service not answering, not a shape nobody can read. */
test('a request the platform never made raises SessionError unavailable', async () => {
  const ports: Posting<number> = {
    ...posting([]),
    post: async () => Promise.reject(new TypeError('Network request failed')),
  };
  expect((await failedWith(createSession(IDENTITY, ports).anonymousToken())).code).toBe('unavailable');
});

/** An answer that came back in time leaves no timer behind, which would otherwise hold the process for fifteen seconds. */
test('an exchange that answered cancels its own deadline', async () => {
  const ports = posting([{ status: 200, body: JSON.stringify({ x_anonymous_token: 'anon-123' }) }]);
  await createSession(IDENTITY, ports).anonymousToken();
  expect(ports.timers).toEqual([]);
});
