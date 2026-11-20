/**
 * The addresses of the paper's own pages on the open web, where the app sends a reader rather than reading anything.
 *
 * They belong to the newsroom and not to this build, so they are named once, here, rather than written at the screen
 * that sends a reader to one. What the app reads comes through its content door, whichever source the build chose.
 */
export const NEWSROOM = {
  /**
   * The paper itself, on the open web, where a numéro taken off the shelf is read.
   *
   * It is the site and not a page inside it, and that is a limit rather than a choice: humanite.fr refuses this
   * build's requests, so no deeper address can be read and checked from here, and a link that answers nothing is
   * worse than one that lands on the paper. The shelf says as much above the covers, so leaving the app is something
   * a reader reads before it happens rather than after.
   */
  site: 'https://www.humanite.fr/',
  /**
   * Writing to the desk that answers readers, and calling it.
   *
   * Both are the same two the account screen prints, written here as the phone takes them rather than as the screen
   * reads them: a number is dialled from its digits and an international prefix, never from the spaces a French
   * number is read in. The screen keeps the reading; this keeps the address.
   */
  mail: 'mailto:relationlecteur@humanite.fr',
  phone: 'tel:+33155844030',
} as const satisfies Readonly<Record<string, string>>;

/**
 * One article on the open web, for a reader the app cannot give it to.
 *
 * The site answers its own short address for every piece, the number the app knows it by: on 20/11/2026,
 * `https://www.humanite.fr/?p=<id>` answered a 301 to the article's own page, for an article of the day's front page.
 * It is read in the browser, where the reader's own connection to humanite.fr is, and not by the app — which is the
 * point: a subscriber the site recognises and the app's service does not still reads what they paid for.
 */
export const articleOnSite = (id: string): string => `${NEWSROOM.site}?p=${encodeURIComponent(id)}`;
