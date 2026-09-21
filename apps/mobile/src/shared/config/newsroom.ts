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
  /**
   * The paper itself, on the open web, where a numéro taken off the shelf is read.
   *
   * It is the site and not a page inside it, and that is a limit rather than a choice: humanite.fr refuses this
   * build's requests, so no deeper address can be read and checked from here, and a link that answers nothing is
   * worse than one that lands on the paper. The shelf says as much above the covers, so leaving the app is something
   * a reader reads before it happens rather than after.
   */
  site: 'https://www.humanite.fr/',
} as const satisfies Readonly<Record<string, string>>;
