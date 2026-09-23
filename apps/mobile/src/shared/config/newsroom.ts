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
} as const satisfies Readonly<Record<string, string>>;
