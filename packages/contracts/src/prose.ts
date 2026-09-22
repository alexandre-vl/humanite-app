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
  ['nbsp', ' '],
  ['quot', '"'],
  ['raquo', '»'],
  ['rsquo', '’'],
]);

/**
 * Text as a reader should see it: entities resolved, tags gone, runs of space closed up.
 *
 * The edges are deliberately left alone. A sentence is read in runs — words, then a bold name, then words again —
 * and the space that separates two runs sits at the edge of one of them: « <strong>Ouizille : </strong>C'est » reads
 * as « Ouizille :C'est » the moment each run is trimmed on its own. Trimming happens once the runs are joined.
 */
const plain = (markup: string): string =>
  markup
    .replace(/<[^>]*>/gu, '')
    .replace(/&#(\d+);/gu, (whole, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (whole, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/giu, (whole, name: string) => NAMED[name.toLowerCase()] ?? whole)
    .replace(/\s+/gu, ' ');

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
 * The name of one thing a reading of a body can get wrong. A union rather than a list, nothing ever walking the
 * codes: a reading names exactly one, and a fixture names the set it expects.
 */
export type ProseCode =
  'prose/markup-left' | 'prose/entity-left' | 'prose/aside-kept' | 'prose/donation-kept' | 'prose/nothing-read';

/** One thing a judging found wrong, and what it read to find it out. */
export type ProseFinding = Readonly<{ code: ProseCode; says: string }>;

/** A way of reading a body, which is what the judging below is handed rather than reaching for one. */
export type ProseReader = (html: string) => readonly Block[];

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

/**
 * The body the judging reads, and the two things in it that belong to the page rather than to the article.
 *
 * Exported because a fixture has to be able to hand back a reading that kept one of them — word for word, or the
 * judging would not recognise it — and that is the only way to show the judging would have spoken.
 */
export const THE_BODY = { html: SAMPLE, elsewhere: ELSEWHERE, appeal: APPEAL } as const;

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
 * Whether a reading of a body leaves a screen only prose.
 *
 * The reading is handed in rather than reached for, and that is what makes the rule provable: a judging that called
 * `readProse` itself could only ever answer about `readProse`, so nothing could show that it answers at all. Given
 * the reading, a fixture hands it one that forgets to strip a tag, or to resolve an entity, or to drop what belongs
 * to the page rather than to the article — and reads the code that comes back.
 */
export const judgeProse = (read: ProseReader): readonly ProseFinding[] => {
  const blocks = read(SAMPLE);
  if (blocks.length === 0) {
    return [{ code: 'prose/nothing-read', says: 'un corps qui porte deux phrases n’a rendu aucun bloc' }];
  }
  const words = blocks.map(textOf);
  const has = (test: (text: string) => boolean): boolean => words.some(test);
  return [
    ...(has((text) => /<[^>]*>/u.test(text))
      ? [{ code: 'prose/markup-left' as const, says: 'du balisage est resté dans le texte d’un bloc' }]
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
  ];
};
