import { BLOCK, judgeProse, readPlain, readProse, THE_BODY } from '@huma/contracts';
import type { PlainReader, ProseCode, ProseReader } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';

const define = fixtureFactory<ProseCode>();

/**
 * Readings of the journal's markup with one thing left in, judged by the journal's own judging.
 *
 * The judging is real and the readings are not, for the same reason everywhere on this bench: a judging handed the
 * real readings can answer nothing but « the reading is in order », and that is what the package's own test says.
 * What a fixture shows is the other half — that the judging would have spoken had a tag, an entity, an aside, a
 * donation form, a swallowed line break or a loose edge survived — and the only way to show it is to hand it a
 * reading where one did.
 *
 * Two doors are judged and every fixture breaks exactly one of them, leaving the other real. A tag left in a
 * paragraph and a tag left in a title are the same defect and answer with the same code, so each is shown once,
 * on whichever door can be broken most plainly.
 */
const judged = (prose: ProseReader, plain: PlainReader) => async (): Promise<readonly ProseCode[]> =>
  Promise.resolve(judgeProse({ prose, plain }).map((finding) => finding.code));

/** A reading of a body that gets it right and then reads one sentence too many. */
const saying =
  (words: string): ProseReader =>
  (html) => [
    ...readProse(html),
    ...BLOCK.array().parse([{ type: 'paragraph', spans: [{ type: 'text', value: words }] }]),
  ];

/**
 * A reading of a body that keeps, of a sentence, only the stretches holding a word — as this one did until a phone
 * showed two words soldered — and so drops what kept two runs apart when nothing but a break or a blank did.
 */
const soldering: ProseReader = (html) =>
  readProse(html).map((block) =>
    block.type === 'paragraph' || block.type === 'quote'
      ? { ...block, spans: block.spans.filter((span) => ('value' in span ? span.value : span.text).trim() !== '') }
      : block,
  );

export const PROSE_FIXTURES = [
  define(
    'prose/reader',
    'la lecture du journal, telle qu’elle rend un corps et un champ court',
    [],
    judged(readProse, readPlain),
  ),
  define(
    'prose/markup-left',
    'une lecture qui laisse une balise dans une phrase',
    ['prose/markup-left'],
    judged(saying('un <b>mot</b> en gras'), readPlain),
  ),
  define(
    'prose/entity-left',
    'une lecture qui ne résout pas une entité HTML',
    ['prose/entity-left'],
    judged(saying('une entit&eacute; non résolue'), readPlain),
  ),
  define(
    'prose/aside-kept',
    'une lecture qui garde le titre d’un autre article',
    ['prose/aside-kept'],
    judged(saying(THE_BODY.elsewhere), readPlain),
  ),
  define(
    'prose/donation-kept',
    'une lecture qui garde l’appel au don qui clôt chaque article',
    ['prose/donation-kept'],
    judged(saying(THE_BODY.appeal), readPlain),
  ),
  define(
    'prose/break-glued',
    'une lecture qui laisse tomber le retour à la ligne et soude les deux mots qu’il sépare',
    ['prose/break-glued'],
    judged(readProse, (html) => readPlain(html.replaceAll('<br>', ''))),
  ),
  define(
    'prose/break-glued-body',
    'une lecture qui ne garde d’une phrase que les passages porteurs d’un mot, et soude ceux qu’un blanc séparait',
    ['prose/break-glued'],
    judged(soldering, readPlain),
  ),
  define(
    'prose/edges-loose',
    'une lecture qui garde le blanc que le gabarit laisse au bord d’un champ court',
    ['prose/edges-loose'],
    judged(readProse, (html) => ` ${readPlain(html)} `),
  ),
  define(
    'prose/nothing-read',
    'une lecture qui ne rend aucun bloc d’un corps qui en porte',
    ['prose/nothing-read'],
    judged(() => [], readPlain),
  ),
  define(
    'prose/nothing-read-plain',
    'une lecture qui ne rend aucun mot d’un champ court qui en porte',
    ['prose/nothing-read'],
    judged(readProse, () => ''),
  ),
] as const;
