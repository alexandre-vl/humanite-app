import { BLOCK, textOf } from './article.ts';
import type { Block, BlockInput } from './article.ts';
import type { SpanInput } from './content.ts';
import type { Finding } from './finding.ts';
import { PICTURE } from './picture.ts';
import { typeset, UNBREAKABLE } from './typography.ts';

/**
 * How a body the journal publishes becomes the blocks a screen knows.
 *
 * The service answers one string per article: the whole page as WordPress rendered it, forty-five to seventy-six
 * kilobytes of it, scripts and a donation form included. A screen must never see any of that — the primitives take
 * branded text and nothing else — so this is where the markup stops. What comes out is the closed union the contracts
 * declare, parsed by their own schema, and what could not be turned into one of its members is dropped rather than
 * smuggled through as a string.
 *
 * Nothing here is a general HTML parser and nothing here should become one. It reads the shapes this journal's own
 * renderer emits, measured on the bodies of a capture: paragraphs with links, emphasis and bold, its own question
 * block, the box that introduces a speaker of a debate, headings, quotes, and a picture of the journal with the words
 * under it. A shape it does not know leaves no trace — which is the point, and which `judgeProse` is there to keep
 * true.
 */

/**
 * Where the journal closes every one of its articles. Everything from here on belongs to a form, not to an article.
 *
 * Exported because a second reader depends on it: the capture tool trims a recorded body around this very mark, and a
 * trim that cut somewhere else would hand this reading a body shaped like no body the service sends. One mark, read by
 * both, cannot drift between them.
 */
export const DONATION = '<div id="form_don"';

/**
 * Elements whose text is not prose and must never reach a reader. An embedded player goes with them, frame and all:
 * the figure that held one is left with no picture, and a figure with no picture of the journal is no block.
 */
const DROPPED = /<(script|style|svg|noscript|form|iframe)\b[^>]*>[\s\S]*?<\/\1>/giu;

/** The block-level elements a body of this journal is made of. */
const BLOCKS = /<(p|h2|h3|h4|h5|h6|blockquote|figure)\b([^>]*)>([\s\S]*?)<\/\1>/giu;

/** The inline elements a paragraph of this journal is made of. */
const INLINE = /<(strong|b|em|i|a)\b([^>]*)>([\s\S]*?)<\/\1>/giu;

/** The class the journal marks a question of an interview with — a heading, in everything but its name. */
const QUESTION = 'wp-block-huma-question';

/**
 * Containers the renderer puts inside a body that belong to the page and not to the article.
 *
 * `seealso-component` is « Sur le même thème »: other articles' headlines, each in a paragraph of its own, which
 * land in the middle of the prose unless the whole container goes. They cannot become `related` blocks either — the
 * link carries a slug and the service takes an id.
 *
 * This is a list of what has been seen, not a rule about what exists. A body shaped in a way no capture has shown
 * will leak something, and the only thing that will say so is a reading of a new capture.
 */
const ASIDES = ['seealso-component'] as const;

/**
 * The named entities this renderer emits, and what each one stands for. Numeric entities are read by their code
 * point, so only the names need a table.
 *
 * Written as pairs of strings rather than as keys, for the same reason the wire's own key is: these names belong
 * to HTML's vocabulary and not to this repo's, and every identifier of this repo is a word of the glossary.
 */
const NAMED: Readonly<Record<string, string>> = Object.fromEntries([
  ['amp', '&'],
  ['apos', '’'],
  ['eacute', 'é'],
  ['gt', '>'],
  ['hellip', '…'],
  ['laquo', '«'],
  ['lt', '<'],
  ['nbsp', UNBREAKABLE],
  ['quot', '"'],
  ['raquo', '»'],
  ['rsquo', '’'],
]);

/**
 * Tags that end a line rather than a run: what follows one starts a line of its own, so it leaves a space behind.
 *
 * Every other tag can go without a trace, because what it wraps carries on the sentence around it. These cannot:
 * « la suite<br>et la fin » dropped like the rest reads « la suiteet la fin », one word where the journal wrote two.
 * The journal writes a break in a standfirst and in a caption, and a closing paragraph wherever it sets two.
 */
const BREAKS = /<br\b[^>]*>|<\/(?:p|div|li|h[1-6]|blockquote)>/giu;

/**
 * Runs of blank that close up, which is every blank but the one the journal put there on purpose.
 *
 * French sets a space before a colon, a semicolon, a question mark and a closing quotation mark, and that space does
 * not break: a line that wrapped there would leave the punctuation alone at the start of the next. The journal writes
 * it as `&nbsp;` — two hundred and fifteen times in the captions of one capture alone — and a reading that folded it
 * into an ordinary space would undo, silently, the one piece of typography the wire actually carries.
 *
 * It is the only blank spared, because it is the only one the journal sets on purpose: every other blank that is
 * not an ordinary space appears once or twice in a whole capture, inside a script or a bundle, never a sentence.
 * Written as an escape for the reason `UNBREAKABLE` is: a pattern cannot name a constant.
 */
const BLANKS = /[^\S\u00A0]+/gu;

/**
 * Text as a reader should see it: entities resolved, tags gone, runs of space closed up, and set the way French sets
 * it — the journal's own typography, where its service sent some other.
 *
 * The edges are deliberately left alone. A sentence is read in runs — words, then a bold name, then words again —
 * and the space that separates two runs sits at the edge of one of them: « <strong>Ouizille : </strong>C'est » reads
 * as « Ouizille :C'est » the moment that edge is cut off with the run. What happens to it is `piecesOf`'s to decide.
 */
const plain = (markup: string): string =>
  typeset(
    markup
      .replace(BREAKS, ' ')
      .replace(/<[^>]*>/gu, '')
      .replace(/&#(\d+);/gu, (whole, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/giu, (whole, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&([a-z]+);/giu, (whole, name: string) => NAMED[name.toLowerCase()] ?? whole)
      .replace(BLANKS, ' '),
  );

/**
 * The same markup with every element of a given class written anew by `rewrite`, from the whole element as it was —
 * the elements it nests included.
 *
 * A pattern cannot find where such an element ends: these containers hold other containers of the same tag, and a
 * non-greedy match closes on the first inner end tag. So the end is found by counting opens against closes, which is
 * the only way to take a whole element and not its first half.
 */
const rewritten = (markup: string, className: string, rewrite: (element: string) => string): string => {
  const opening = new RegExp(`<(\\w+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'iu');
  let text = markup;
  let found = opening.exec(text);
  while (found !== null) {
    const tag = found[1] ?? 'div';
    const edges = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'giu');
    edges.lastIndex = found.index;
    let depth = 0;
    let end = text.length;
    let edge = edges.exec(text);
    while (edge !== null) {
      depth += edge[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = edge.index + edge[0].length;
        break;
      }
      edge = edges.exec(text);
    }
    text = `${text.slice(0, found.index)} ${rewrite(text.slice(found.index, end))} ${text.slice(end)}`;
    found = opening.exec(text);
  }
  return text;
};

/** The markup inside the first element of a given class within `element`, as written, or nothing. */
const innerOf = (element: string, className: string): string =>
  new RegExp(`<(\\w+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, 'iu').exec(element)?.[2] ??
  '';

/**
 * The box a debate opens each speaker's first answer with — a portrait, a name, and what the speaker does — as the one
 * line the journal itself writes for every later answer: the name in bold, then the rest. Read as it stood, it was two
 * paragraphs of their own, a name and a job title set as prose between two answers; the portrait goes, a face the app
 * would lay beside no one else's.
 */
const SPEAKER = 'debater-component';

const speakerLine = (element: string): string => {
  const name = innerOf(element, 'debater__name').trim();
  const role = innerOf(element, 'debater__function').trim();
  return name === '' ? '' : `<p><strong>${name}</strong>${role === '' ? '' : `, ${role}`}</p>`;
};

const attribute = (attributes: string, name: string): string =>
  new RegExp(`${name}="([^"]*)"`, 'iu').exec(attributes)?.[1] ?? '';

/** Plain words, the run a sentence is made of wherever the markup marks out nothing else. */
const asText = (text: string): SpanInput => ({ type: 'text', text });

/** The kind of run the markup around some words makes of them, once those words are bare. */
const runOf = (tag: string, attributes: string): ((bare: string) => SpanInput) => {
  if (tag === 'a') {
    const url = attribute(attributes, 'href');
    // Only an address a browser can open becomes a link; anything else is read as the words it wraps.
    return url.startsWith('http') ? (text) => ({ type: 'link', text, target: { kind: 'external', url } }) : asText;
  }
  if (tag === 'em' || tag === 'i') {
    return (text) => ({ type: 'emphasis', text });
  }
  if (tag === 'strong' || tag === 'b') {
    return (text) => ({ type: 'strong', text });
  }
  return asText;
};

/**
 * What keeps two runs of a sentence apart, as a screen draws it: the journal's unbreakable space where it set one,
 * and one ordinary space wherever else, however much blank the markup held there.
 */
type Gap = Readonly<{ type: 'gap'; blank: typeof UNBREAKABLE | ' ' }>;

/** A run of a sentence with its words bare, or the gap between two runs. */
type Piece = SpanInput | Gap;

const gapOf = (blank: string): Gap => ({ type: 'gap', blank: blank.includes(UNBREAKABLE) ? UNBREAKABLE : ' ' });

/** Some words as a run of their kind, bare, with the blank at either edge of them set down as the gap it is. */
const piecesOf = (words: string, run: (bare: string) => SpanInput): readonly Piece[] => {
  const bare = words.trim();
  if (bare === '') {
    return words === '' ? [] : [gapOf(words)];
  }
  const lead = words.slice(0, words.length - words.trimStart().length);
  const trail = words.slice(words.trimEnd().length);
  return [...(lead === '' ? [] : [gapOf(lead)]), run(bare), ...(trail === '' ? [] : [gapOf(trail)])];
};

/**
 * The pieces of a sentence as the spans a screen draws, one straight after the other.
 *
 * Gaps that meet close into one, the unbreakable space winning since the journal set it on purpose, and the gaps at
 * either end of the sentence go. Each gap left is added to the plain words beside it or, between two marked runs,
 * becomes plain words of its own: a screen draws each run's words and nothing between them, so a gap no span carries
 * is two words soldered into one: « <em>la suite.</em><br><em>Et la fin</em> » drawn « la suite.Et la fin », as a
 * body the phone read on 23/09/2026 was.
 */
const spansFrom = (pieces: readonly Piece[]): SpanInput[] => {
  const spans: SpanInput[] = [];
  let gap: Gap | null = null;
  for (const piece of pieces) {
    if (piece.type === 'gap') {
      if (gap === null || piece.blank === UNBREAKABLE) {
        gap = piece;
      }
      continue;
    }
    const last = spans.at(-1);
    if (gap === null || last === undefined) {
      spans.push(piece);
    } else if (last.type === 'text') {
      spans[spans.length - 1] = { ...last, text: `${last.text}${gap.blank}` };
      spans.push(piece);
    } else if (piece.type === 'text') {
      spans.push({ ...piece, text: `${gap.blank}${piece.text}` });
    } else {
      spans.push(asText(gap.blank), piece);
    }
    gap = null;
  }
  return spans;
};

/** A sentence, cut into the runs the markup marks out and the plain words between them. */
const spansOf = (markup: string): SpanInput[] => {
  const pieces: Piece[] = [];
  let read = 0;
  INLINE.lastIndex = 0;
  let found = INLINE.exec(markup);
  while (found !== null) {
    const [whole, tag = '', attributes = '', inner = ''] = found;
    pieces.push(
      ...piecesOf(plain(markup.slice(read, found.index)), asText),
      ...piecesOf(plain(inner), runOf(tag.toLowerCase(), attributes)),
    );
    read = found.index + whole.length;
    found = INLINE.exec(markup);
  }
  pieces.push(...piecesOf(plain(markup.slice(read)), asText));
  return spansFrom(pieces);
};

/**
 * A picture of the journal set inside a body, with the words under it: the address of its image, and its caption read
 * apart from the credit written into it. A figure holding anything else — a player whose frame was dropped, a picture
 * served from elsewhere — is no picture of the journal, and no block.
 */
const figureOf = (inner: string): BlockInput | null => {
  const address = /<img\b[^>]*\bsrc="([^"]*)"/iu.exec(inner)?.[1];
  const picture = PICTURE.safeParse({ kind: 'journal', url: (address ?? '').replaceAll('&amp;', '&') });
  if (!picture.success) {
    return null;
  }
  const { caption, credit } = readLegend(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/iu.exec(inner)?.[1] ?? '');
  return {
    type: 'image',
    picture: picture.data,
    ...(caption === '' ? {} : { caption }),
    ...(credit === '' ? {} : { credit }),
  };
};

const blockOf = (tag: string, attributes: string, inner: string): BlockInput | null => {
  if (tag === 'figure') {
    return figureOf(inner);
  }
  const heading = tag !== 'p' && tag !== 'blockquote';
  const question = tag === 'p' && attribute(attributes, 'class').split(/\s+/u).includes(QUESTION);
  if (heading || question) {
    const text = plain(inner).trim();
    return text === '' ? null : { type: 'heading', text };
  }
  const spans = spansOf(inner);
  if (spans.length === 0) {
    return null;
  }
  return tag === 'blockquote' ? { type: 'quote', spans } : { type: 'paragraph', spans };
};

/**
 * The blocks a body holds, in the order it holds them.
 *
 * The donation form is cut first and by position, not by pattern: it closes every article, so everything after it is
 * gone whatever it contains. Then the elements that carry no prose, then the prose itself. The result is parsed by
 * the contracts' own schema, which is what brands its text — nothing reaches a screen that a schema has not read.
 */
export const readProse = (html: string): readonly Block[] => {
  const end = html.indexOf(DONATION);
  const cut = (end < 0 ? html : html.slice(0, end)).replace(DROPPED, ' ');
  const kept = ASIDES.reduce((text, className) => rewritten(text, className, () => ''), cut);
  const body = rewritten(kept, SPEAKER, speakerLine);
  const blocks: BlockInput[] = [];
  BLOCKS.lastIndex = 0;
  let found = BLOCKS.exec(body);
  while (found !== null) {
    const [, tag = '', attributes = '', inner = ''] = found;
    const block = blockOf(tag.toLowerCase(), attributes, inner);
    if (block !== null) {
      blocks.push(block);
    }
    found = BLOCKS.exec(body);
  }
  return BLOCK.array().parse(blocks);
};

/**
 * The one line a short field of the service holds: a title, a standfirst, the caption under a picture.
 *
 * A body is not the only thing the service sends as markup — everything it sends is. Measured on one capture: every
 * standfirst arrives wrapped in the `<p class="chapo">` the journal's own stylesheet keys on, a hundred and six
 * apostrophes are written `&#8217;`, three hundred and sixty-nine spaces `&nbsp;`, and captions carry emphasis, a
 * superscript and the odd link. Put on a screen as they come, a title reads « L&#8217;été » and a standfirst opens
 * with a paragraph tag.
 *
 * What comes back is a line and not a block, because a title is a line: the caller hands it to the schema of the item
 * it belongs to, and that schema is what brands it. Nothing here brands anything, so nothing here can reach a screen
 * by itself.
 */
export const readPlain = (html: string): string => plain(html).trim();

/** The mark a picture's credit follows, and the word the pictures of a body are credited with when it is not there. */
const COPYRIGHT = '©';
const SOURCED = /\s*\|\s*(source\s*:.*)$/iu;

/**
 * What the journal writes under a picture, read as the two things it is: what the picture shows, and who took it.
 *
 * The service sends a caption and no credit, and the journal writes the credit into the caption: on 264 of the 287
 * captions of a capture, after the caption's last sentence and behind a « © » — « …Nations unies. ©DPA/ABACA » — and
 * behind « | Source : » under the pictures a body carries. Read apart, the credit can be set as what it is: quieter, and
 * never read as part of the sentence about the picture. The « © » keeps its name on the same line as the name.
 *
 * A caption with neither mark is all caption, and one with nothing but the mark all credit. A « © » with nothing after
 * it credits no one, and is dropped with the nothing.
 */
export const readLegend = (html: string): Readonly<{ caption: string; credit: string }> => {
  const line = readPlain(html);
  const at = line.lastIndexOf(COPYRIGHT);
  if (at >= 0) {
    const caption = line.slice(0, at).replace(/[\s|–—-]+$/u, '');
    const who = line.slice(at + COPYRIGHT.length).trim();
    return { caption, credit: who === '' ? '' : `${COPYRIGHT}${UNBREAKABLE}${who}` };
  }
  const sourced = SOURCED.exec(line);
  return sourced === null
    ? { caption: line, credit: '' }
    : { caption: line.slice(0, sourced.index), credit: sourced[1] ?? '' };
};

/** The name of one thing a reading of the journal's markup can get wrong. */
export type ProseCode =
  | 'prose/markup-left'
  | 'prose/entity-left'
  | 'prose/aside-kept'
  | 'prose/donation-kept'
  | 'prose/break-glued'
  | 'prose/edges-loose'
  | 'prose/speaker-split'
  | 'prose/figure-lost'
  | 'prose/nothing-read';

/** A way of reading a body, which is what the judging below is handed rather than reaching for one. */
export type ProseReader = (html: string) => readonly Block[];

/** A way of reading a short field, handed in for the same reason. */
export type PlainReader = (html: string) => string;

/** The two doors the journal's markup comes through: a body becomes blocks, a short field becomes its one line. */
export type ProseReaders = Readonly<{ prose: ProseReader; plain: PlainReader }>;

/** The words the aside of the sample carries, which belong to another article and must not survive the reading. */
const ELSEWHERE = 'Le titre d’un autre article';

/** The words the donation block of the sample carries, which belong to a form and must not survive the reading. */
const APPEAL = 'Soutenez-nous';

/**
 * The runs the second sentence of the body sample is set in, kept apart by nothing a screen draws — a line break
 * between two runs of emphasis, a blank between one of them and a link, the blank the link's words end on — which must
 * reach a screen as the stretches of one sentence and not as words soldered together.
 */
const APART = ['Une seconde phrase.', 'Puis une autre', 'et un lien', 'pour finir.'] as const;

/** Who the body sample's speaker box introduces, and what she does: one line of a debate, not two of prose. */
const SPEAKER_NAME = 'Une intervenante';
const SPEAKER_ROLE = 'directrice d’une association';

/** The picture the body sample sets, as the journal addresses its pictures, and the words written under it. */
const FIGURE_PICTURE = 'https://www.humanite.fr/wp-content/uploads/2026/09/une-image.jpg?w=1024';
const FIGURE_CAPTION = 'Une légende.';
const FIGURE_CREDIT = 'Une agence';

/**
 * A body shaped the way this journal shapes one, small enough to read at a glance: a sentence with a run of bold and
 * an entity, an aside holding another article's headline, a speaker box of a debate, a second sentence in runs, a
 * picture with its credit written into its caption, and the donation block that closes it.
 */
const SAMPLE = [
  '<p>Un <strong>mot</strong> et une entit&eacute;.</p>',
  `<div class="seealso-component"><div><p>${ELSEWHERE}</p></div></div>`,
  `<div class="debater-component"><img class="avatar" src="https://www.humanite.fr/wp-content/uploads/2026/09/une-voix.jpg?w=150&amp;h=150&amp;crop=1" alt=""><div class="debater"><p class="debater__name">${SPEAKER_NAME}</p><p class="debater__function">${SPEAKER_ROLE}</p></div></div>`,
  `<p><em>${APART[0]}</em><br><em>${APART[1]}</em> <a href="https://www.humanite.fr/">${APART[2]} </a>${APART[3]}</p>`,
  `<figure class="wp-block-image"><img src="${FIGURE_PICTURE}" alt=""><figcaption>${FIGURE_CAPTION} ©${FIGURE_CREDIT}</figcaption></figure>`,
  `<div id="form_don"><p>${APPEAL}</p></div>`,
].join('');

/** The words the short sample sets on either side of its line break, which must stay two and not run into one. */
const BEFORE = 'la suite';
const AFTER = 'et la fin';

/**
 * A short field shaped the way this journal shapes one: the paragraph its stylesheet wraps a standfirst in, a run of
 * emphasis, the space it does not want broken, a line break, and the blank the wrapper leaves at either end.
 */
const HEADLINE = `\n\n<p class="chapo">Un <em>mot</em>&nbsp;: ${BEFORE}<br>${AFTER}.</p>\n`;

/**
 * What the judging reads, and the things in it that must not survive a reading.
 *
 * Exported because a fixture has to be able to hand back a reading that kept one of them — word for word, or the
 * judging would not recognise it — and that is the only way to show the judging would have spoken.
 */
export const THE_BODY = {
  html: SAMPLE,
  headline: HEADLINE,
  elsewhere: ELSEWHERE,
  appeal: APPEAL,
  before: BEFORE,
  after: AFTER,
} as const;

/**
 * Whether a reading of the journal's markup leaves a screen nothing but text a reader should see.
 *
 * The readings are handed in rather than reached for, and that is what makes the rule provable: a judging that called
 * `readProse` itself could only ever answer about `readProse`, so nothing could show that it answers at all. Given
 * them, a fixture hands in one that forgets to strip a tag, or to resolve an entity, or to drop what belongs to the
 * page rather than to the article, or to keep two words apart across a line break or a blank — and reads the code
 * that comes back.
 *
 * Both doors are judged together because the fault is the same fault on either side: a title with a tag in it is as
 * unreadable as a paragraph with one, and the reader of one calls the reader of the other. What only a short field
 * can get wrong — an edge left loose — has a code of its own; what either can get wrong has one code between them —
 * two words soldered where the journal set them apart among others — so a defect is named once however it arrives.
 *
 * A reading that rendered nothing is reported alone: everything below reads what came back, and a judging of nothing
 * would name every fault at once and tell the reader which to fix last.
 */
export const judgeProse = (read: ProseReaders): readonly Finding<ProseCode>[] => {
  const blocks = read.prose(SAMPLE);
  const line = read.plain(HEADLINE);
  if (blocks.length === 0 || line === '') {
    return [
      {
        code: 'prose/nothing-read',
        says:
          blocks.length === 0
            ? 'un corps qui porte deux phrases n’a rendu aucun bloc'
            : 'un champ court qui porte une phrase n’a rendu aucun mot',
      },
    ];
  }
  const words = [...blocks.map(textOf), line];
  const has = (test: (text: string) => boolean): boolean => words.some(test);
  const glued = [
    ...(line.includes(`${BEFORE} ${AFTER}`) ? [] : [`« ${BEFORE} » et « ${AFTER} »`]),
    ...(has((text) => text.includes(APART.join(' '))) ? [] : [`les passages de « ${APART.join(' ')} »`]),
  ];
  const figured = blocks.some(
    (block) =>
      block.type === 'image' &&
      block.picture.kind === 'journal' &&
      block.caption === FIGURE_CAPTION &&
      block.credit === `©${UNBREAKABLE}${FIGURE_CREDIT}`,
  );
  return [
    ...(has((text) => /<[^>]*>/u.test(text))
      ? [{ code: 'prose/markup-left' as const, says: 'du balisage est resté dans le texte rendu' }]
      : []),
    ...(has((text) => /&[a-z]+;|&#\d+;/iu.test(text))
      ? [{ code: 'prose/entity-left' as const, says: 'une entité HTML n’a pas été résolue' }]
      : []),
    ...(has((text) => text.includes(ELSEWHERE))
      ? [{ code: 'prose/aside-kept' as const, says: `« ${ELSEWHERE} » appartient à un encart, pas à l’article` }]
      : []),
    ...(has((text) => text.includes(APPEAL))
      ? [{ code: 'prose/donation-kept' as const, says: `« ${APPEAL} » appartient au formulaire de don` }]
      : []),
    ...(glued.length === 0
      ? []
      : [{ code: 'prose/break-glued' as const, says: `${glued.join(' ; ')} : des mots se sont soudés` }]),
    ...(line === line.trim()
      ? []
      : [{ code: 'prose/edges-loose' as const, says: 'le blanc du gabarit est resté au bord de la phrase' }]),
    ...(has((text) => text.includes(SPEAKER_NAME) && text.includes(SPEAKER_ROLE))
      ? []
      : [{ code: 'prose/speaker-split' as const, says: `« ${SPEAKER_NAME} » n’est pas présentée en une ligne` }]),
    ...(figured
      ? []
      : [
          {
            code: 'prose/figure-lost' as const,
            says: 'une image du journal n’a pas été rendue avec sa légende et son crédit',
          },
        ]),
  ];
};
