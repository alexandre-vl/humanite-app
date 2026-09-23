import type { Position } from '@huma/kit/diagnostics';
import { START } from '@huma/kit/diagnostics';
import { isRecord } from '@huma/unknown';
import type { Nodes, Parent, Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';
import { CODE_MASK } from './mask.ts';

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

/** Offsets of the line starts of a source, to turn an offset into a 1-based line and column. */
export type SourceIndex = Readonly<{ text: string; lineStarts: readonly number[] }>;

export function indexSource(text: string): SourceIndex {
  const lineStarts = [0];
  for (let offset = text.indexOf('\n'); offset !== -1; offset = text.indexOf('\n', offset + 1)) {
    lineStarts.push(offset + 1);
  }
  return { text, lineStarts };
}

function positionAtOffset(source: SourceIndex, offset: number): Position {
  const line = source.lineStarts.findLastIndex((start) => start <= offset);
  return { line: line + 1, column: offset - (source.lineStarts[line] ?? 0) + 1 };
}

/**
 * Source offset of each character of `value` inside `raw`, the source text of the node: escapes, entities and the
 * indentation of continuation lines are skipped. `null` when the value cannot be followed in the source.
 */
function alignValue(raw: string, value: string): readonly number[] | null {
  const offsets: number[] = [];
  let cursor = 0;
  for (const character of value) {
    for (;;) {
      if (cursor >= raw.length) {
        return null;
      }
      if (raw[cursor] === '&' && /^&[#\w]{1,32};/u.test(raw.slice(cursor))) {
        offsets.push(...Array.from({ length: character.length }, () => cursor));
        cursor = raw.indexOf(';', cursor) + 1;
        break;
      }
      if (raw.startsWith(character, cursor)) {
        for (let unit = 0; unit < character.length; unit += 1) {
          offsets.push(cursor + unit);
        }
        cursor += character.length;
        break;
      }
      if (raw[cursor] === '\\' && raw.startsWith(character, cursor + 1)) {
        cursor += 1;
      } else if (/\s/u.test(raw[cursor] ?? '')) {
        cursor += 1;
      } else {
        return null;
      }
    }
  }
  return offsets;
}

/** Text as a reader sees it, with a way back from any character to its position in the file. */
export type TextSpan = Readonly<{ text: string; locate: (index: number) => Position }>;

type Piece = Readonly<{
  value: string;
  /** Source offset of each code unit of `value`; `null` when only the node start is known. */
  offsets: readonly number[] | null;
  start: Position;
}>;

const isOpaque = (node: Nodes): boolean => node.type === 'code' || node.type === 'yaml' || node.type === 'html';

function pieceOf(node: Nodes, value: string, source: SourceIndex | null): Piece {
  const start = positionOf(node);
  const from = node.position?.start.offset;
  const to = node.position?.end.offset;
  if (source === null || from === undefined || to === undefined) {
    return { value, offsets: null, start };
  }
  const raw = source.text.slice(from, to);
  if (node.type === 'inlineCode') {
    const inside = value === CODE_MASK ? -1 : raw.indexOf(value);
    return {
      value,
      offsets: inside === -1 ? null : Array.from(value, (character, index) => from + inside + index),
      start,
    };
  }
  const aligned = alignValue(raw, value);
  return { value, offsets: aligned?.map((offset) => from + offset) ?? null, start };
}

/**
 * Text of `node` with inline code kept (`'keep'`) or replaced by `CODE_MASK` (`'mask'`), code blocks left out, and
 * every whitespace run, non-breaking spaces included, collapsed to one space. `locate` gives the position in the
 * source of any character of the text, or the start of its node when the source spells it differently.
 */
export function textSpan(node: Nodes, code: 'keep' | 'mask', source: SourceIndex | null): TextSpan {
  const pieces: Piece[] = [];
  const collect = (current: Nodes): void => {
    if (current.type === 'text') {
      pieces.push(pieceOf(current, current.value, source));
    } else if (current.type === 'inlineCode') {
      pieces.push(pieceOf(current, code === 'keep' ? current.value : CODE_MASK, source));
    } else if (current.type === 'break') {
      pieces.push({ value: ' ', offsets: null, start: positionOf(current) });
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
      if (origin === undefined) {
        return fallback;
      }
      const offset = origin.piece.offsets?.[origin.offset];
      return source === null || offset === undefined ? origin.piece.start : positionAtOffset(source, offset);
    },
  };
}

/** Text of `node` as `textSpan` reads it, without positions. */
export const plainText = (node: Nodes, code: 'keep' | 'mask'): string => textSpan(node, code, null).text;

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

const isTextNode = (value: unknown): boolean => isRecord(value) && value['type'] === 'text';

/**
 * Serialisation of nodes that two sources differing only by formatting share: positions and list tightness are left
 * out, and whitespace runs inside prose are one space. Code keeps every character.
 */
export const structuralFingerprint = (value: unknown): string =>
  JSON.stringify(value, function (this: unknown, key: string, member: unknown): unknown {
    if (key === 'position' || key === 'spread') {
      return undefined;
    }
    return key === 'value' && isTextNode(this) && typeof member === 'string' ? member.replace(/\s+/gu, ' ') : member;
  });
