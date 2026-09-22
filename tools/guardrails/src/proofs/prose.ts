import { BLOCK, judgeProse, readProse, THE_BODY } from '@huma/contracts';
import type { ProseCode, ProseReader } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';

const define = fixtureFactory<ProseCode>();

/**
 * Readings of a body with one thing left in, judged by the journal's own judging.
 *
 * The judging is real and the readings are not, for the same reason everywhere on this bench: a judging handed the
 * real reading can answer nothing but « the reading is in order », and that is what the package's own test says.
 * What a fixture shows is the other half — that the judging would have spoken had a tag, an entity, an aside or a
 * donation form survived — and the only way to show it is to hand it a reading where one did.
 *
 * Each broken reading still calls the real one and adds exactly one sentence that should never have been read.
 */
const judged = (read: ProseReader) => async (): Promise<readonly ProseCode[]> =>
  Promise.resolve(judgeProse(read).map((finding) => finding.code));

/** A reading that gets the body right and then reads one sentence too many. */
const saying =
  (words: string): ProseReader =>
  (html) => [
    ...readProse(html),
    ...BLOCK.array().parse([{ type: 'paragraph', spans: [{ type: 'text', value: words }] }]),
  ];

export const PROSE_FIXTURES = [
  define('prose/reader', 'la lecture du journal, telle qu’elle rend un corps', [], judged(readProse)),
  define(
    'prose/markup-left',
    'une lecture qui laisse une balise dans une phrase',
    ['prose/markup-left'],
    judged(saying('un <b>mot</b> en gras')),
  ),
  define(
    'prose/entity-left',
    'une lecture qui ne résout pas une entité HTML',
    ['prose/entity-left'],
    judged(saying('une entit&eacute; non résolue')),
  ),
  define(
    'prose/aside-kept',
    'une lecture qui garde le titre d’un autre article',
    ['prose/aside-kept'],
    judged(saying(THE_BODY.elsewhere)),
  ),
  define(
    'prose/donation-kept',
    'une lecture qui garde l’appel au don qui clôt chaque article',
    ['prose/donation-kept'],
    judged(saying(THE_BODY.appeal)),
  ),
  define(
    'prose/nothing-read',
    'une lecture qui ne rend aucun bloc d’un corps qui en porte',
    ['prose/nothing-read'],
    judged(() => []),
  ),
] as const;
