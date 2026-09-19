import type { ArticleId, Block, Span } from '@huma/contracts';
import type { TextRun } from '#primitives/text';

/** Where a link inside a body points: another item of the corpus, or a page outside it. */
export type LinkTarget = Extract<Span, { type: 'link' }>['target'];

/**
 * The spans of a paragraph as runs of a sentence. It is the one place the contract's four kinds meet the two ways a
 * run may differ, so a kind added to the contract stops the build here rather than rendering as plain words: `text`
 * differs by nothing, `emphasis` and `strong` by their face, and a link by answering a press.
 */
export const runsOf = (spans: readonly Span[], open: (target: LinkTarget) => void): readonly TextRun[] =>
  spans.map((span): TextRun => {
    switch (span.type) {
      case 'text':
        return { text: span.value };
      case 'emphasis':
        return { text: span.value, face: 'italic' };
      case 'strong':
        return { text: span.value, face: 'strong' };
      case 'link':
        return {
          text: span.text,
          onPress: () => {
            open(span.target);
          },
        };
    }
  });

/**
 * The articles a body announces at its foot. They are gathered before anything renders so the screen asks for all of
 * them at once: the content answers a list of ids in one call, and a card needs a summary, never a body.
 */
export const relatedIds = (blocks: readonly Block[]): readonly ArticleId[] =>
  blocks.flatMap((block) => (block.type === 'related' ? [block.id] : []));
