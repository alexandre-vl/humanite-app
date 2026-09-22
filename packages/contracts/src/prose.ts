import { BLOCK } from './content.ts';
import type { Block, BlockInput, SpanInput } from './content.ts';

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
 * block, headings, and quotes. A shape it does not know leaves no trace — which is the point, and which `judgeProse`
 * is there to keep true.
 */

/** Where the journal closes every one of its articles. Everything from here on belongs to a form, not to an article. */
const DONATION = '<div id="form_don"';

/** Elements whose text is not prose and must never reach a reader. */
const DROPPED = /<(script|style|svg|noscript|form|iframe|figure)\b[^>]*>[\s\S]*?<\/\1>/giu;

/** The block-level elements a body of this journal is made of. */
const BLOCKS = /<(p|h2|h3|h4|h5|h6|blockquote)\b([^>]*)>([\s\S]*?)<\/\1>/giu;

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
  ['nbsp', '\u00A0'],
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
 * Written as an escape, here and in the table above, so the source carries no byte a reader of it cannot see.
 */
const BLANKS = /[^\S\u00A0]+/gu;

/**
 * Text as a reader should see it: entities resolved, tags gone, runs of space closed up.
 *
 * The edges are deliberately left alone. A sentence is read in runs — words, then a bold name, then words again —
 * and the space that separates two runs sits at the edge of one of them: « <strong>Ouizille : </strong>C'est » reads
 * as « Ouizille :C'est » the moment each run is trimmed on its own. Trimming happens once the runs are joined.
 */
const plain = (markup: string): string =>
  markup
    .replace(BREAKS, ' ')
    .replace(/<[^>]*>/gu, '')
    .replace(/&#(\d+);/gu, (whole, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (whole, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/giu, (whole, name: string) => NAMED[name.toLowerCase()] ?? whole)
    .replace(BLANKS, ' ');

/**
 * The same markup with every element of a given class removed, the elements it nests included.
 *
 * A pattern cannot do this: these containers hold other containers of the same tag, and a non-greedy match closes on
 * the first inner end tag. So the end is found by counting opens against closes, which is the only way to take a
 * whole element out and not its first half.
 */
const withoutClass = (markup: string, className: string): string => {
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
    text = `${text.slice(0, found.index)} ${text.slice(end)}`;
    found = opening.exec(text);
  }
  return text;
};

const attribute = (attributes: string, name: string): string =>
  new RegExp(`${name}="([^"]*)"`, 'iu').exec(attributes)?.[1] ?? '';

/** A run of a sentence, as the markup around it says it should be read. */
const spanOf = (tag: string, attributes: string, inner: string): SpanInput | null => {
  const value = plain(inner);
  if (value.trim() === '') {
    return null;
  }
  if (tag === 'a') {
    const url = attribute(attributes, 'href');
    // Only an address a browser can open becomes a link; anything else is read as the words it wraps.
    return url.startsWith('http')
      ? { type: 'link', text: value.trim(), target: { kind: 'external', url } }
      : { type: 'text', value };
  }
  if (tag === 'em' || tag === 'i') {
    return { type: 'emphasis', value: value.trim() };
  }
  if (tag === 'strong' || tag === 'b') {
    return { type: 'strong', value };
  }
  return { type: 'text', value };
};

/** The text a run carries, whatever kind of run it is. */
const wordsOf = (span: SpanInput): string => ('value' in span ? span.value : span.text);

/** The same run, its words replaced. */
const reworded = (span: SpanInput, words: string): SpanInput =>
  'value' in span ? { ...span, value: words } : { ...span, text: words };

/** A sentence, cut into the runs the markup marks out and the plain words between them, trimmed once at each end. */
const spansOf = (markup: string): SpanInput[] => {
  const spans: SpanInput[] = [];
  let read = 0;
  INLINE.lastIndex = 0;
  let found = INLINE.exec(markup);
  while (found !== null) {
    const [whole, tag = '', attributes = '', inner = ''] = found;
    const before = plain(markup.slice(read, found.index));
    if (before.trim() !== '') {
      spans.push({ type: 'text', value: before });
    }
    const span = spanOf(tag.toLowerCase(), attributes, inner);
    if (span !== null) {
      spans.push(span);
    }
    read = found.index + whole.length;
    found = INLINE.exec(markup);
  }
  const rest = plain(markup.slice(read));
  if (rest.trim() !== '') {
    spans.push({ type: 'text', value: rest });
  }
  const first = spans[0];
  const last = spans[spans.length - 1];
  if (first !== undefined) {
    spans[0] = reworded(first, wordsOf(first).replace(/^\s+/u, ''));
  }
  if (last !== undefined) {
    spans[spans.length - 1] = reworded(last, wordsOf(last).replace(/\s+$/u, ''));
  }
  return spans.filter((span) => wordsOf(span) !== '');
};

const blockOf = (tag: string, attributes: string, inner: string): BlockInput | null => {
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
  const body = ASIDES.reduce((text, className) => withoutClass(text, className), cut);
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

/**
 * The name of one thing a reading of the journal's markup can get wrong. A union rather than a list, nothing ever
 * walking the codes: a reading names exactly one, and a fixture names the set it expects.
 */
export type ProseCode =
  | 'prose/markup-left'
  | 'prose/entity-left'
  | 'prose/aside-kept'
  | 'prose/donation-kept'
  | 'prose/break-glued'
  | 'prose/edges-loose'
  | 'prose/nothing-read';

/** One thing a judging found wrong, and what it read to find it out. */
export type ProseFinding = Readonly<{ code: ProseCode; says: string }>;

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
 * A body shaped the way this journal shapes one, small enough to read at a glance: a sentence with a run of bold and
 * an entity, an aside holding another article's headline, a second sentence, and the donation block that closes it.
 */
const SAMPLE = [
  '<p>Un <strong>mot</strong> et une entit&eacute;.</p>',
  `<div class="seealso-component"><div><p>${ELSEWHERE}</p></div></div>`,
  '<p>Une seconde phrase.</p>',
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

/** The words a block carries, whatever kind of block it is. */
const textOf = (block: Block): string => {
  if (block.type === 'heading') {
    return block.text;
  }
  if (block.type === 'paragraph' || block.type === 'quote') {
    return block.spans.map(wordsOf).join(' ');
  }
  if (block.type === 'image') {
    return block.caption;
  }
  if (block.type === 'video') {
    return block.title;
  }
  if (block.type === 'callout') {
    return [block.title, block.text, block.button].join(' ');
  }
  return '';
};

/**
 * Whether a reading of the journal's markup leaves a screen nothing but text a reader should see.
 *
 * The readings are handed in rather than reached for, and that is what makes the rule provable: a judging that called
 * `readProse` itself could only ever answer about `readProse`, so nothing could show that it answers at all. Given
 * them, a fixture hands in one that forgets to strip a tag, or to resolve an entity, or to drop what belongs to the
 * page rather than to the article, or to keep two words apart across a line break — and reads the code that comes
 * back.
 *
 * Both doors are judged together because the fault is the same fault on either side: a title with a tag in it is as
 * unreadable as a paragraph with one, and the reader of one calls the reader of the other. What only a short field
 * can get wrong — a break swallowed, an edge left loose — has a code of its own; what either can get wrong has one
 * code between them, so a defect is named once however it arrives.
 *
 * A reading that rendered nothing is reported alone: everything below reads what came back, and a judging of nothing
 * would name every fault at once and tell the reader which to fix last.
 */
export const judgeProse = (read: ProseReaders): readonly ProseFinding[] => {
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
    ...(line.includes(`${BEFORE} ${AFTER}`)
      ? []
      : [{ code: 'prose/break-glued' as const, says: `« ${BEFORE} » et « ${AFTER} » se sont soudés en un mot` }]),
    ...(line === line.trim()
      ? []
      : [{ code: 'prose/edges-loose' as const, says: 'le blanc du gabarit est resté au bord de la phrase' }]),
  ];
};
