import type { LinkTarget, Span } from '@huma/contracts';
import type { TextRun } from '#primitives/text';

/**
 * The spans of a paragraph as runs of a sentence. It is the one place the contract's four kinds meet the two ways a
 * run may differ, so a kind added to the contract stops the build here rather than rendering as plain words: `text`
 * differs by nothing, `emphasis` and `strong` by their face, and a link by answering a press.
 */
export const runsOf = (spans: readonly Span[], open: (target: LinkTarget) => void): readonly TextRun[] =>
  spans.map((span): TextRun => {
    switch (span.type) {
      case 'text':
        return { text: span.text };
      case 'emphasis':
        return { text: span.text, face: 'italic' };
      case 'strong':
        return { text: span.text, face: 'strong' };
      case 'link':
        return {
          text: span.text,
          onPress: () => {
            open(span.target);
          },
        };
    }
  });
