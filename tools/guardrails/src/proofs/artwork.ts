import type { SectionCode } from '@huma/design-tokens';
import { fixtureFactory } from '@huma/fixtures';
import type { ArtworkCode, Draw } from '@huma/mock-content/artwork';
import { artworkSvg, judgeArtwork } from '@huma/mock-content/artwork';

const define = fixtureFactory<ArtworkCode>();

/**
 * Drawings with one thing broken, read by the generator's own reading.
 *
 * The reading is real and the drawings are not, for the same reason everywhere on this bench: a reading handed the
 * generator can answer nothing but « the generator is in order », and that is what the package's own test says. What
 * a fixture shows is the other half — that the reading would have spoken had the drawing stopped following from its
 * key and its section — and the only way to show it is to hand it a drawing that has.
 *
 * Each broken drawing still calls the real generator and takes exactly one thing away from what it is given: its key,
 * its section, or the promise that two calls agree.
 */
const judged = (draw: Draw) => async (): Promise<readonly ArtworkCode[]> =>
  Promise.resolve(judgeArtwork(draw).map((finding) => finding.code));

/** A key the generator never sees, so every call draws the same picture whatever it was asked for. */
const FIXED_KEY = 'un-seul-dessin';

/** A section the generator never sees, so every section is drawn in the same ground. */
const FIXED_SECTION: SectionCode = 'pol';

export const ARTWORK_FIXTURES = [
  define('artwork/generator', 'le générateur du journal, tel qu’il dessine', [], judged(artworkSvg)),
  define(
    'artwork/not-deterministic',
    'un dessin qui ne rend pas deux fois la même chose',
    ['artwork/not-deterministic'],
    judged((key, code) => `${artworkSvg(key, code)}<!--${String(Math.random())}-->`),
  ),
  define(
    'artwork/key-ignored',
    'un dessin qui ne lit pas la clé de l’item qu’il illustre',
    ['artwork/key-ignored'],
    judged((key, code) => artworkSvg(FIXED_KEY, code)),
  ),
  define(
    'artwork/section-ignored',
    'un dessin qui ne lit pas la couleur de sa rubrique',
    ['artwork/section-ignored'],
    judged((key) => artworkSvg(key, FIXED_SECTION)),
  ),
] as const;
