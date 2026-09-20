/**
 * What the paper is held to on a reader's phone, and what answers for it.
 *
 * A budget is not a measurement: it is the line a measurement is read against, and the thing that decides whether an
 * option stays open. Which is why it lives in code rather than in prose — a number written in a document is a number
 * nothing compares anything to. What has actually been measured, on which phone and on which commit, belongs to the
 * journal of the session that measured it; this table is what that journal is read against.
 *
 * Both budgets are read from what Android answers about the app, never from the app's own account of itself: a build
 * that reported on its own speed would have to carry the reporting, and carrying it would change the speed.
 */

/** What a budget is counted in. */
export type Unit = 'ms' | 'percent';

export type BudgetId = 'cold-start' | 'scroll-jank';

export type Budget = Readonly<{
  /** What the budget holds, in one sentence. */
  what: string;
  /** The most a reading may be. */
  limit: number;
  unit: Unit;
  /** The command whose answer is read, as it is typed at a phone. */
  instrument: string;
  /** What the instrument does not see, so a reading is never taken for more than it is. */
  blindTo: string;
}>;

export const BUDGETS = {
  'cold-start': {
    what: 'du lancement à froid à la première image peinte',
    limit: 1_500,
    unit: 'ms',
    instrument: 'adb shell am start -W -n <paquet>/.MainActivity',
    blindTo:
      'la première image est celle de l’écran de démarrage, pas du premier article : Android ne compte le contenu qu’une fois reportFullyDrawn appelé, que React Native n’appelle pas.',
  },
  'scroll-jank': {
    what: 'la part des images du fil rendues hors de leur échéance',
    limit: 1,
    unit: 'percent',
    instrument: 'adb shell dumpsys gfxinfo <paquet>, après reset et trente secondes de défilement',
    blindTo:
      'ce que le compositeur a fait de l’image une fois rendue : le compte est celui du processus de l’app, échéance comprise depuis Android 12.',
  },
} as const satisfies Readonly<Record<BudgetId, Budget>>;
