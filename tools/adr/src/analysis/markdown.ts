import type { Position } from '@huma/kit/diagnostics';
import { START } from '@huma/kit/diagnostics';
import type { Nodes, Parent, Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';

export function parseMarkdown(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter(['yaml']), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml']), gfmFromMarkdown()],
  });
}

export const positionOf = (node: Nodes): Position =>
  node.position === undefined ? START : { line: node.position.start.line, column: node.position.start.column };

const hasChildren = (node: Nodes): node is Extract<Nodes, Parent> => 'children' in node;

/** Every node of the tree, depth first, parents before children. */
export function* walk(node: Nodes): Generator<Nodes> {
  yield node;
  if (hasChildren(node)) {
    for (const child of node.children) {
      yield* walk(child);
    }
  }
}

/** Stands in for inline code in masked text: it separates words and never matches a keyword, a citation or a mention. */
export const CODE_MASK = String.fromCodePoint(0xfffc);

/** Text as a reader sees it, with a way back from any character to its position in the file. */
export type TextSpan = Readonly<{ text: string; locate: (index: number) => Position }>;

type Piece = Readonly<{ value: string; start: Position }>;

const isOpaque = (node: Nodes): boolean => node.type === 'code' || node.type === 'yaml' || node.type === 'html';

function positionWithin(piece: Piece, offset: number): Position {
  const before = piece.value.slice(0, offset);
  const lastNewline = before.lastIndexOf('\n');
  if (lastNewline === -1) {
    return { line: piece.start.line, column: piece.start.column + offset };
  }
  const newlines = before.split('\n').length - 1;
  return { line: piece.start.line + newlines, column: offset - lastNewline };
}

/**
 * Text of `node` with inline code kept (`'keep'`) or replaced by `CODE_MASK` (`'mask'`), code blocks left out, and
 * every whitespace run, non-breaking spaces included, collapsed to one space.
 */
export function textSpan(node: Nodes, code: 'keep' | 'mask'): TextSpan {
  const pieces: Piece[] = [];
  const collect = (current: Nodes): void => {
    if (current.type === 'text') {
      pieces.push({ value: current.value, start: positionOf(current) });
    } else if (current.type === 'inlineCode') {
      pieces.push({ value: code === 'keep' ? current.value : CODE_MASK, start: positionOf(current) });
    } else if (current.type === 'break') {
      pieces.push({ value: ' ', start: positionOf(current) });
    } else if (!isOpaque(current) && hasChildren(current)) {
      current.children.forEach(collect);
    }
  };
  collect(node);
  let text = '';
  const origins: Readonly<{ piece: Piece; offset: number }>[] = [];
  let pendingSpace: Readonly<{ piece: Piece; offset: number }> | null = null;
  for (const piece of pieces) {
    let offset = 0;
    for (const character of piece.value) {
      if (/\s/u.test(character)) {
        pendingSpace ??= { piece, offset };
      } else {
        if (pendingSpace !== null && text !== '') {
          text += ' ';
          origins.push(pendingSpace);
        }
        pendingSpace = null;
        text += character;
        for (let unit = 0; unit < character.length; unit += 1) {
          origins.push({ piece, offset: offset + unit });
        }
      }
      offset += character.length;
    }
  }
  const fallback = positionOf(node);
  return {
    text,
    locate: (index) => {
      const origin = origins[Math.max(0, Math.min(index, origins.length - 1))];
      return origin === undefined ? fallback : positionWithin(origin.piece, origin.offset);
    },
  };
}

export const plainText = (node: Nodes, code: 'keep' | 'mask'): string => textSpan(node, code).text;

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

/** Serialisation without source positions: equal for two sources that differ only by formatting. */
export const structuralFingerprint = (node: Nodes): string =>
  JSON.stringify(node, (key, value: unknown) => (key === 'position' ? undefined : value));
