import type { LegibilityCode, LegibilityTables, Theme } from '@huma/design-tokens';
import { judgeLegibility, THE_PAPER } from '@huma/design-tokens';
import { fixtureFactory } from '@huma/fixtures';

const define = fixtureFactory<LegibilityCode>();

/**
 * Tables of the paper with one thing broken, judged by the paper's own reading.
 *
 * The reading is real and the tables are not, which is the only arrangement that proves anything: a reading handed
 * the paper's own tables can answer nothing but « the paper is in order », and that is what the package's own test
 * already says. What a fixture has to show is the other half — that the reading would have spoken had the paper been
 * wrong — and the only way to show it is to hand it a paper that is.
 *
 * Each break is surgical, so that exactly one code comes back. A colour is broken where nothing else reads it: the
 * second ink, which no drawn control touches, and the track of the switch, which carries no text.
 */
const broken = (tables: Partial<LegibilityTables>) => async (): Promise<readonly LegibilityCode[]> =>
  Promise.resolve(judgeLegibility({ ...THE_PAPER, ...tables }).map((finding) => finding.code));

/** Every theme of the paper, repainted the same way, so neither of them is left holding the colour it had. */
const repainted = (paint: (theme: Theme) => Theme): LegibilityTables['themes'] =>
  Object.fromEntries(Object.entries(THE_PAPER.themes).map(([name, theme]) => [name, paint(theme)]));

/** The one departure the paper declares, which is the white it lays on the red it is printed in. */
const [DEPARTURE] = THE_PAPER.departures;

export const LEGIBILITY_FIXTURES = [
  define('legibility/paper-in-order', 'les couleurs du journal, telles qu’il les imprime', [], broken({})),
  define(
    'legibility/under-bar',
    'une encre peinte de la couleur de la page où elle est posée',
    ['legibility/under-bar'],
    broken({ themes: repainted((theme) => ({ ...theme, textSecondary: theme.background })) }),
  ),
  define(
    'legibility/departure-worse',
    'un écart tombé sous le plancher que sa propre mesure lui donne',
    ['legibility/departure-worse'],
    broken({ departures: DEPARTURE === undefined ? [] : [{ ...DEPARTURE, floor: 4 }] }),
  ),
  define(
    'legibility/departure-obsolete',
    'un écart qui atteint désormais le seuil, sa justification ayant cessé d’être vraie',
    ['legibility/departure-obsolete'],
    // The bar is lowered under the pairing rather than the pairing lifted over the bar: the colour is the red the
    // paper is printed in, and repainting it would move every other reading that touches it.
    broken({
      printings: { ...THE_PAPER.printings, onPrimary: { ...THE_PAPER.printings.onPrimary, smallest: 'headline' } },
    }),
  ),
  define(
    'legibility/departure-unprinted',
    'un écart qui excuse une paire qu’aucun écran n’imprime',
    ['legibility/departure-unprinted'],
    broken({
      departures: [
        ...THE_PAPER.departures,
        { tone: 'link', ground: 'card', floor: 1, because: 'une paire que rien ne pose' },
      ],
    }),
  ),
  define(
    'legibility/shape-under-bar',
    'la piste de l’interrupteur peinte de la couleur de la page',
    ['legibility/shape-under-bar'],
    broken({ themes: repainted((theme) => ({ ...theme, control: theme.background })) }),
  ),
  define(
    'legibility/ground-unprinted',
    'un fond que la règle nomme et sur lequel plus rien n’est posé',
    ['legibility/ground-unprinted'],
    // The two inks laid on the sheet a group of rows sits on stop being laid there, and the sheet is left named by the
    // rule with nothing printed on it. It is the one ground no departure and no part of the switch names, so this
    // breaks nothing else.
    broken({
      printings: {
        ...THE_PAPER.printings,
        textPrimary: {
          ...THE_PAPER.printings.textPrimary,
          grounds: THE_PAPER.printings.textPrimary.grounds.filter((ground) => ground !== 'card'),
        },
        textMuted: {
          ...THE_PAPER.printings.textMuted,
          grounds: THE_PAPER.printings.textMuted.grounds.filter((ground) => ground !== 'card'),
        },
      },
    }),
  ),
] as const;
