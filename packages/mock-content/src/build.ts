import { readdirSync, readFileSync } from 'node:fs';
import { ARTICLE, ARTICLE_SUMMARY, instantAt } from '@huma/contracts';
import type { Article, ArticleSummary, BlockInput, HeroInput, SectionId, SpanInput } from '@huma/contracts';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import type { BlockContent, DefinitionContent, PhrasingContent, RootContent } from 'mdast';
import { directive } from 'micromark-extension-directive';
import { frontmatter } from 'micromark-extension-frontmatter';
import { bylineOf, SECTIONS } from './registries.ts';
import { validateCorpus } from './validate.ts';

/** Where each item file lives, relative to this module. */
const CORPUS = new URL('../corpus/', import.meta.url);

/** The shapes `ARTICLE` accepts as input, before it brands and validates them, derived from the contracts. */
type RawSpan = SpanInput;
type RawTarget = Extract<RawSpan, { type: 'link' }>['target'];

/**
 * A block as a corpus file writes it. A related block names the item it points at by id: the summary the domain's
 * block carries is the other item's, so it is written into the body only once every item has been read.
 */
type RawBlock = Exclude<BlockInput, { type: 'related' }> | Readonly<{ type: 'related'; id: string }>;

/** An item as its file writes it: everything a summary holds, read, and a body whose related blocks still name ids. */
type WrittenItem = Readonly<{ summary: ArticleSummary; blocks: readonly RawBlock[] }>;

/** A `::name[label]{attribute="value"}` line, the node `mdast-util-directive` adds to the tree. */
type Directive = Extract<RootContent, { type: 'leafDirective' }>;

/** The flat `key: value` front matter; values are kept raw so a colon inside a title survives. */
const parseFrontmatter = (text: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    text.split('\n').flatMap((line) => {
      const match = /^([a-z]+):\s*(.*)$/u.exec(line);
      return match === null ? [] : [[match[1] ?? '', (match[2] ?? '').trim()] as const];
    }),
  );

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
  const [caption = '', credit = ''] = value.split('|').map((part) => part.trim());
  return {
    picture: { kind: 'corpus', key: `${id}-hero` },
    ...(caption === '' ? {} : { caption }),
    ...(credit === '' ? {} : { credit }),
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
      if (node.type === 'textDirective') {
        throw new Error(`« :${node.name} » est lu comme une directive : un deux-points collé à un mot en ouvre une`);
      }
      return 'children' in node ? plain(node.children) : '';
    })
    .join('');

/** Where a link points, from its url: another item, or an external page. */
const toTarget = (url: string): RawTarget =>
  url.startsWith('article:') ? { kind: 'article', id: url.slice('article:'.length) } : { kind: 'external', url };

/** Inline content to spans; images are handled at block level, breaks and code fall back to text. */
const toSpans = (nodes: readonly PhrasingContent[]): RawSpan[] =>
  nodes.flatMap((node): RawSpan[] => {
    if (node.type === 'text') {
      return [{ type: 'text', value: node.value }];
    }
    if (node.type === 'emphasis') {
      return [{ type: 'emphasis', value: plain(node.children) }];
    }
    if (node.type === 'strong') {
      return [{ type: 'strong', value: plain(node.children) }];
    }
    if (node.type === 'link') {
      return [{ type: 'link', text: plain(node.children), target: toTarget(node.url) }];
    }
    if (node.type === 'break' || node.type === 'inlineCode') {
      return [{ type: 'text', value: node.type === 'break' ? ' ' : node.value }];
    }
    return [];
  });

/** A blockquote to a quote block, pulling out a trailing `— Source` line that a soft break joins in. */
const toQuote = (children: readonly (BlockContent | DefinitionContent)[]): RawBlock => {
  const paragraph = children.find((child) => child.type === 'paragraph');
  if (paragraph === undefined) {
    return { type: 'quote', spans: [] };
  }
  const spans = toSpans(paragraph.children);
  const last = spans.at(-1);
  if (last?.type === 'text' && last.value.includes('\n')) {
    const lines = last.value.split('\n');
    const tail = lines.at(-1) ?? '';
    if (/^\s*—/u.test(tail)) {
      const head = lines.slice(0, -1).join(' ').trimEnd();
      const body: RawSpan[] =
        head.length > 0 ? [...spans.slice(0, -1), { type: 'text', value: head }] : spans.slice(0, -1);
      return { type: 'quote', spans: body, source: tail.replace(/^\s*—\s*/u, '') };
    }
  }
  return { type: 'quote', spans };
};

/** A paragraph that holds only an image becomes an image block; otherwise a paragraph of spans. */
const toParagraph = (children: readonly PhrasingContent[]): RawBlock => {
  const [only] = children;
  if (children.length === 1 && only?.type === 'image') {
    return { type: 'image', caption: only.alt ?? '', key: only.url };
  }
  return { type: 'paragraph', spans: toSpans(children) };
};

/** A `m:ss` running time to whole seconds. It reaches here as an attribute: inside a label, `:ss` opens a directive. */
const toSeconds = (value: string | null | undefined): number => {
  const [, minutes, seconds] = /^(\d{1,2}):([0-5]\d)$/u.exec(value ?? '') ?? [];
  if (minutes === undefined || seconds === undefined) {
    throw new Error(`durée invalide : « ${value ?? ''} », attendu m:ss`);
  }
  return Number(minutes) * 60 + Number(seconds);
};

/** A leaf directive to its block: prose from its `[label]` split on ` | `, data from its `{name="value"}` attributes. */
const toDirective = (node: Directive): RawBlock => {
  const [first = '', second = '', third = ''] = plain(node.children)
    .split('|')
    .map((part) => part.trim());
  if (node.name === 'video') {
    return { type: 'video', title: first, durationSeconds: toSeconds(node.attributes?.['duration']) };
  }
  if (node.name === 'related') {
    return { type: 'related', id: first };
  }
  if (node.name === 'callout') {
    return { type: 'callout', title: first, text: second, button: third };
  }
  throw new Error(`directive inconnue : ::${node.name}`);
};

const toBlock = (node: RootContent): RawBlock => {
  if (node.type === 'heading') {
    return { type: 'heading', text: plain(node.children) };
  }
  if (node.type === 'paragraph') {
    return toParagraph(node.children);
  }
  if (node.type === 'blockquote') {
    return toQuote(node.children);
  }
  if (node.type === 'leafDirective') {
    return toDirective(node);
  }
  throw new Error(`bloc non pris en charge : ${node.type}`);
};

/**
 * Parse one item file: its summary, read, and its body as written. Exported so its refusals can be pinned by a test.
 * The body is read first, so a block the file gets wrong is what the refusal names, whatever the front matter holds.
 */
export const parseItem = (text: string): WrittenItem => {
  const tree = fromMarkdown(text, {
    extensions: [frontmatter(['yaml']), directive()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml']), directiveFromMarkdown()],
  });
  const head = tree.children[0];
  const front = parseFrontmatter(head?.type === 'yaml' ? head.value : '');
  const id = front['id'] ?? '';
  const hero = front['hero'];
  const byline = bylineOf(splitList(front['authors']));
  const published = front['published'];
  const body = tree.children.filter((node): node is Exclude<RootContent, { type: 'yaml' }> => node.type !== 'yaml');
  const blocks = body.map(toBlock);
  const summary = ARTICLE_SUMMARY.parse({
    id,
    section: front['section'],
    format: front['format'],
    access: front['access'],
    title: front['title'],
    standfirst: front['standfirst'],
    publishedAt: published === undefined ? undefined : (instantAt(published) ?? published),
    ...(byline === undefined ? {} : { byline }),
    ...(hero === undefined ? {} : { hero: toHero(id, hero) }),
    ...(front['emphasis'] === 'true' ? { emphasis: true } : {}),
  });
  return { summary, blocks };
};

/** An item whole: its related blocks given the summary of the item each names, which must be one of the corpus. */
const resolved = (item: WrittenItem, summaries: ReadonlyMap<string, ArticleSummary>): Article =>
  ARTICLE.parse({
    ...item.summary,
    body: {
      kind: 'open',
      blocks: item.blocks.map((block) => {
        if (block.type !== 'related') {
          return block;
        }
        const summary = summaries.get(block.id);
        if (summary === undefined) {
          throw new Error(`::related vers un item absent du corpus : ${block.id}`);
        }
        return { type: 'related', summary };
      }),
    },
  });

/** Reads and validates every item, throwing an aggregate error when the corpus breaks any rule. */
export function buildCorpus(): readonly Article[] {
  const errors: string[] = [];
  const written: { readonly folder: SectionId; readonly file: string; readonly item: WrittenItem }[] = [];
  for (const section of SECTIONS) {
    const directory = new URL(`${section.id}/`, CORPUS);
    const files = readdirSync(directory)
      .filter((name) => name.endsWith('.md'))
      .toSorted((left, right) => left.localeCompare(right));
    for (const file of files) {
      try {
        written.push({ folder: section.id, file, item: parseItem(readFileSync(new URL(file, directory), 'utf8')) });
      } catch (error) {
        errors.push(`${section.id}/${file} : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const summaries = new Map(written.map(({ item }) => [item.summary.id, item.summary]));
  const items = written.flatMap(({ folder, file, item }) => {
    try {
      return [{ folder, article: resolved(item, summaries) }];
    } catch (error) {
      errors.push(`${folder}/${file} : ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  });
  errors.push(...validateCorpus(items));
  if (errors.length > 0) {
    throw new Error(`corpus invalide :\n${errors.join('\n')}`);
  }
  return items.map((item) => item.article).toSorted((left, right) => left.id.localeCompare(right.id));
}
