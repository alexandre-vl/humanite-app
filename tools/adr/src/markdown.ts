import type { Nodes, Parent, Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';
import type { Position } from './diagnostics.ts';
import { START } from './diagnostics.ts';

export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter(['yaml']), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml']), gfmFromMarkdown()],
  });
}

export const positionOf = (node: Nodes): Position =>
  node.position === undefined ? START : { line: node.position.start.line, column: node.position.start.column };

export const hasChildren = (node: Nodes): node is Extract<Nodes, Parent> => 'children' in node;

/** Depth-first, parents before children. */
export function* walk(node: Nodes): Generator<Nodes> {
  yield node;
  if (hasChildren(node)) {
    for (const child of node.children) {
      yield* walk(child);
    }
  }
}

/** Stands in for inline code in `plainText`: it separates words and never matches a keyword or a citation. */
export const CODE_MASK = String.fromCodePoint(0xfffc);

const isOpaque = (node: Nodes): boolean => node.type === 'code' || node.type === 'yaml' || node.type === 'html';

/**
 * Text of a node as a reader sees it, with inline code kept (`'keep'`) or replaced by `CODE_MASK` (`'mask'`),
 * whitespace runs (non-breaking spaces included) collapsed to one space.
 */
export function plainText(node: Nodes, code: 'keep' | 'mask'): string {
  const parts: string[] = [];
  const collect = (current: Nodes): void => {
    if (current.type === 'text') {
      parts.push(current.value);
    } else if (current.type === 'inlineCode') {
      parts.push(code === 'keep' ? current.value : CODE_MASK);
    } else if (current.type === 'break') {
      parts.push(' ');
    } else if (!isOpaque(current) && hasChildren(current)) {
      current.children.forEach(collect);
    }
  };
  collect(node);
  return normalizeSpaces(parts.join(''));
}

export const normalizeSpaces = (text: string): string => text.replace(/\s+/gu, ' ').trim();

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Words of every text and inline code leaf, outside code blocks, front matter and HTML. */
export function countWords(root: Root): number {
  let words = 0;
  for (const node of walk(root)) {
    if (node.type === 'text' || node.type === 'inlineCode') {
      words += node.value.match(WORD)?.length ?? 0;
    }
  }
  return words;
}

/** Serialisation that ignores source positions: equal for two sources that differ only by formatting. */
export const structuralFingerprint = (node: Nodes): string =>
  JSON.stringify(node, (key, value: unknown) => (key === 'position' ? undefined : value));
