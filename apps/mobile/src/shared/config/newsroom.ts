/**
 * The addresses the paper keeps outside this app.
 *
 * Everything else the app shows it holds itself: the corpus is written for it, the pictures are drawn for it, and no
 * request leaves the phone. These are the exception — places on the open web that belong to the newsroom and not to
 * this build, so they are named once, here, rather than written at the screen that sends a reader to one.
 */
export const NEWSROOM = {
  /** Where a reader who answers the call for support goes. */
  subscription: 'https://www.humanite.fr/abonnement',
} as const satisfies Readonly<Record<string, string>>;
