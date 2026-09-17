import { expect, expectTypeOf, test } from 'vitest';
import { SESSION } from './index.ts';
import type { Session } from './index.ts';

test('SESSION carries the subscriber flag', () => {
  const session: Session = SESSION.parse({ isSubscriber: true });
  expectTypeOf(session).toEqualTypeOf<Session>();
  expect(SESSION.safeParse({ isSubscriber: 'yes' }).success).toBe(false);
});
