import { judgeRight, readArticle } from '@huma/contracts';
import type { Article, Opening, Read, RightCode } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';
import { isRecord } from '@huma/unknown';

const define = fixtureFactory<RightCode>();

/**
 * Readings of one article of the service, each with one thing done wrong, judged by the journal's own judging.
 *
 * The judging is real and the readings are not, for the reason given everywhere on this bench. Each broken reading is
 * one a hurried change could plausibly write, and each is still the real reading with one step changed: it takes the
 * arrival of a body for the right to read it, which is what the service's own answer tempts a reader of code into;
 * or it decides by `premium`, the word that says the journal sells the article, what only `right` decides, the word
 * that says this reader may have it.
 */
const judged = (opening: Opening) => async (): Promise<readonly RightCode[]> =>
  Promise.resolve(judgeRight(opening).map((finding) => finding.code));

export const RIGHT_FIXTURES = [
  define('right/reader', 'la lecture du journal, telle qu’elle ouvre un article', [], judged(readArticle)),
  define(
    'right/withheld-opened',
    'une lecture qui tient l’arrivée d’un corps pour le droit de le lire',
    ['right/withheld-opened'],
    judged((answer) => readArticle(isRecord(answer) ? { ...answer, right: true } : answer)),
  ),
  define(
    'right/granted-withheld',
    'une lecture qui retient par « premium » ce que seul « right » décide',
    ['right/granted-withheld'],
    judged((answer): Read<Article> => {
      const read = readArticle(answer);
      if ('refused' in read || !(isRecord(answer) && answer['premium'] === true)) {
        return read;
      }
      return { item: { ...read.item, body: { kind: 'withheld' } } };
    }),
  ),
];
