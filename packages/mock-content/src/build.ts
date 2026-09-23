import { readdirSync, readFileSync } from 'node:fs';
import { ARTICLE, instantAt, SECTION_ID, typeset } from '@huma/contracts';
import type { BlockInput, HeroInput, SectionId, SpanInput, SummaryInput } from '@huma/contracts';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import type { BlockContent, DefinitionContent, PhrasingContent, RootContent } from 'mdast';
import { frontmatter } from 'micromark-extension-frontmatter';
import type { CorpusArticle } from './item.ts';
import { bylineOf, SECTIONS } from './registries.ts';
import { validateCorpus } from './validate.ts';

/** Where each item file lives, relative to this module. */
const CORPUS = new URL('../corpus/', import.meta.url);

/** The shapes `ARTICLE` accepts as input, before it brands and validates them, derived from the contracts. */
type RawSpan = SpanInput;
type RawBlock = BlockInput;

/** The flat `key: value` front matter; values are kept raw so a colon inside a title survives. */
const parseFrontmatter = (text: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    text.split('\n').flatMap((line) => {
      const match = /^([a-z]+):\s*(.*)$/u.exec(line);
      return match === null ? [] : [[match[1] ?? '', (match[2] ?? '').trim()] as const];
    }),
  );

/**
 * A written field set the French way, and a missing one left missing for the schema to refuse by name. The corpus is
 * written the way anyone types — a space before a colon, a straight apostrophe — and reaches a screen set the way the
 * journal's own text is read: one rule, the contracts' own, for both.
 */
const typesetOr = (value: string | undefined): string | undefined => (value === undefined ? undefined : typeset(value));

/** A `key: a, b` scalar split into trimmed, non-empty parts. */
const splitList = (value: string | undefined): readonly string[] =>
  value === undefined
    ? []
    : value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

/**
 * A `légende | crédit` hero scalar. Its key is the item's own, so a lead picture is named without being authored, and
 * it is a picture of the corpus: the only kind whose file the bundler holds.
 */
const toHero = (id: string, value: string): HeroInput => {
  const [caption = '', credit = ''] = value.split('|').map((part) => typeset(part.trim()));
  return {
    picture: { kind: 'corpus', key: `${id}-hero` },
    ...(caption === '' ? {} : ({ caption } satisfies Partial<HeroInput>)),
    ...(credit === '' ? {} : ({ credit } satisfies Partial<HeroInput>)),
  };
};

/** The plain text of inline content, line breaks becoming spaces. */
const plain = (nodes: readonly PhrasingContent[]): string =>
  nodes
    .map((node): string => {
      if (node.type === 'text' || node.type === 'inlineCode') {
        return node.value;
      }
      if (node.type === 'break') {
        return ' ';
      }
      return 'children' in node ? plain(node.children) : '';
    })
    .join('');

/** Inline content to spans; images are handled at block level, breaks and code fall back to text. */
const toSpans = (nodes: readonly PhrasingContent[]): RawSpan[] =>
  nodes.flatMap((node): RawSpan[] => {
    if (node.type === 'text') {
      return [{ type: 'text', text: typeset(node.value) }];
    }
    if (node.type === 'emphasis') {
      return [{ type: 'emphasis', text: typeset(plain(node.children)) }];
    }
    if (node.type === 'strong') {
      return [{ type: 'strong', text: typeset(plain(node.children)) }];
    }
    if (node.type === 'link') {
      return [{ type: 'link', text: typeset(plain(node.children)), url: node.url }];
    }
    if (node.type === 'break' || node.type === 'inlineCode') {
      return [{ type: 'text', text: node.type === 'break' ? ' ' : node.value }];
    }
    return [];
  });

/** A blockquote to a quote block: its words, as the journal sets a quotation apart, with no one named under it. */
const toQuote = (children: readonly (BlockContent | DefinitionContent)[]): RawBlock => {
  const paragraph = children.find((child) => child.type === 'paragraph');
  return { type: 'quote', spans: paragraph === undefined ? [] : toSpans(paragraph.children) };
};

/** A paragraph that holds only an image becomes an image block; otherwise a paragraph of spans. */
const toParagraph = (children: readonly PhrasingContent[]): RawBlock => {
  const [only] = children;
  if (children.length === 1 && only?.type === 'image') {
    const caption = typeset(only.alt ?? '');
    return {
      type: 'image',
      picture: { kind: 'corpus', key: only.url },
      ...(caption === '' ? {} : ({ caption } satisfies Partial<HeroInput>)),
    };
  }
  return { type: 'paragraph', spans: toSpans(children) };
};

const toBlock = (node: RootContent): RawBlock => {
  if (node.type === 'heading') {
    return { type: 'heading', text: typeset(plain(node.children)) };
  }
  if (node.type === 'paragraph') {
    return toParagraph(node.children);
  }
  if (node.type === 'blockquote') {
    return toQuote(node.children);
  }
  throw new Error(`bloc non pris en charge : ${node.type}`);
};

/**
 * Parse one item file into the item it writes. Exported so its refusals can be pinned by a test. The body is read
 * first, so a block the file gets wrong is what the refusal names, whatever the front matter holds.
 */
export const parseItem = (text: string): CorpusArticle => {
  const tree = fromMarkdown(text, {
    extensions: [frontmatter(['yaml'])],
    mdastExtensions: [frontmatterFromMarkdown(['yaml'])],
  });
  const head = tree.children[0];
  const front = parseFrontmatter(head?.type === 'yaml' ? head.value : '');
  const id = front['id'] ?? '';
  const hero = front['hero'];
  const byline = bylineOf(splitList(front['authors']));
  const published = front['published'];
  const body = tree.children.filter((node): node is Exclude<RootContent, { type: 'yaml' }> => node.type !== 'yaml');
  const blocks = body.map(toBlock);
  const article = ARTICLE.parse({
    id,
    format: front['format'],
    access: front['access'],
    title: typesetOr(front['title']),
    standfirst: typesetOr(front['standfirst']),
    publishedAt: published === undefined ? undefined : (instantAt(published) ?? published),
    ...(byline === undefined ? {} : ({ byline } satisfies Partial<SummaryInput>)),
    ...(hero === undefined ? {} : ({ hero: toHero(id, hero) } satisfies Partial<SummaryInput>)),
    body: { kind: 'open', blocks },
  });
  return { section: SECTION_ID.parse(front['section']), ...article };
};

/** Reads and validates every item, throwing an aggregate error when the corpus breaks any rule. */
export function buildCorpus(): readonly CorpusArticle[] {
  const errors: string[] = [];
  const items: { readonly folder: SectionId; readonly article: CorpusArticle }[] = [];
  for (const section of SECTIONS) {
    const directory = new URL(`${section.id}/`, CORPUS);
    const files = readdirSync(directory)
      .filter((name) => name.endsWith('.md'))
      .toSorted((left, right) => left.localeCompare(right));
    for (const file of files) {
      try {
        items.push({ folder: section.id, article: parseItem(readFileSync(new URL(file, directory), 'utf8')) });
      } catch (error) {
        errors.push(`${section.id}/${file} : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  errors.push(...validateCorpus(items));
  if (errors.length > 0) {
    throw new Error(`corpus invalide :\n${errors.join('\n')}`);
  }
  return items.map((item) => item.article).toSorted((left, right) => left.id.localeCompare(right.id));
}
