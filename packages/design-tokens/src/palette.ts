import type { Color } from './brand.ts';
import { color } from './brand.ts';

/**
 * Every colour a theme paints with, and the only place one is written: a theme maps roles onto this table and never
 * spells a value of its own, which a test of the themes holds. Most are measured on the current app
 * (docs/app-actuelle/README.md, § Couleurs); the `dark` family is derived from the measured dark background, the
 * current app having no dark mode to measure. Hex values are lower-cased. Names say what a colour is, not where it is
 * used, so one name can serve several roles.
 *
 * Four measured colours are not here: the logo's own red, the orange of a search button, the red of the system bars
 * and the blue of a browser slider. No theme paints with any of them — three name a control this app draws itself in
 * the paper's own colours, and the fourth names a fault the reference document reports. What the current app looks
 * like is recorded where it is measured; this table is what is painted.
 *
 * Two values depart from the measurement, both because a reading of the current app's own colours failed the rule in
 * `legibility.ts` — which is the whole reason that rule was written down. `dateGrey` measured `#918199`, and the
 * caption it prints is fourteen points of regular type, which WCAG holds to four and a half to one: it reached 3.62
 * on the page, 3.32 on a grouped card and 3.20 on the ground a feed alternates onto. `inkRed` is the paper's red
 * taken down until it can be read as a letter on a light page, `uiRed` itself reaching only 3.83 there. The red is
 * untouched where it is a ground rather than a letter: that is the paper's, and the rule names the departure instead
 * of hiding it.
 *
 * `darkInkRed` is the same step taken the other way, for the dark theme, which has no measurement to depart from: the
 * paper's red with four parts in a hundred of white mixed in, which is the least that reads as a letter on the dark
 * theme's bar. The tab a reader is on is named there in it, and the red itself measured 4.35 on that bar; lifted, it
 * measures 4.53 there, and 5.01 on the dark page where the red measured 4.81.
 *
 * `darkRule` is the dark theme's rule. Derived at `#3a3340`, it measured 1.28 to one against the card whose rows it
 * divides, and was lifted two steps on each channel to clear the ratio the themes' test asks of a rule. At `#3c3542` it
 * cleared it, and could not be seen: the thread of En continu all but vanished on the dark page on the iPhone simulator
 * on 25/09/2026, where the light rule drew one. The ratio flatters two dark colours, and the step of lightness a
 * phone's glass lets through does not (`lightnessStep`): the light rule stands 13.2 steps from its page and 9.9 from a
 * card, and the dark one stood 7.0 and 4.5 from its own. It keeps its hue and its chroma, and takes the least lightness
 * at which it is nowhere fainter than the light rule is at its faintest — CIE L* 32, 12.6 steps from the page, 11.1
 * from the sheet and 10.0 from a card. Captures of L* 23, 28, 32 and 36 side by side agreed.
 *
 * `inkGrey` and `darkSecondary` are the middle step of an ink that had only two. A card sets a title and the summary
 * under it, and both were printed in the same colour at the same weight — so the summary read as a second title
 * rather than as what answers one. The two new values sit between the ink and the muted grey at roughly half the
 * contrast of the step above them: 18.45, 9.74, 5.30 on the light page, 16.90, 11.21, 8.00 on the dark one. Each was
 * chosen to sit between the two it separates rather than beside one of them — the dark page's, which had least room,
 * stands 1.51 under the ink above it and 1.40 over the grey below.
 */
export const PALETTE = {
  uiRed: color('#f13c47'),
  inkRed: color('#ca323c'),
  darkInkRed: color('#f2444e'),
  aubergine: color('#230434'),
  inkGrey: color('#4c3f57'),
  blueGrey: color('#ecf2f2'),
  paleGrey: color('#f5f5f5'),
  ruleGrey: color('#dcd5e0'),
  darkBackground: color('#141414'),
  darkSurface: color('#1e1e1e'),
  darkCard: color('#242424'),
  darkMuted: color('#b0a8b6'),
  darkSecondary: color('#cfc7d5'),
  darkBorder: color('#333333'),
  darkRule: color('#504956'),
  dateGrey: color('#74677a'),
  white: color('#ffffff'),
  black: color('#000000'),
} as const satisfies Readonly<Record<string, Color>>;
