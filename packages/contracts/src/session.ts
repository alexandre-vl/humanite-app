import { z } from 'zod';

/** The reader's session: mock, with no account, only whether they subscribe. */
export const SESSION = z.object({ isSubscriber: z.boolean() });
export type Session = z.infer<typeof SESSION>;
