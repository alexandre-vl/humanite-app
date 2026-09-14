import type { Paragraph } from 'mdast';
import type { BodyContext } from '../body.ts';
import type { Grammar } from '../grammar.ts';
import { plainText, walk } from '../markdown.ts';
import { singleParagraph } from '../outline.ts';

const isSourced = (paragraph: Paragraph, grammar: Grammar): boolean =>
  [...walk(paragraph)].some(
    (node) =>
      node.type === 'link' ||
      node.type === 'inlineCode' ||
      (node.type === 'text' && grammar.scanMentions(node.value).valid.length > 0),
  );

/** Sourced facts in bullet lists, then the problem as a single question. */
export function checkContext({ sections, grammar, report }: BodyContext): void {
  const section = sections.context;
  const last = section.blocks.at(-1);
  if (last?.type === 'paragraph') {
    const question = plainText(last, 'keep');
    if (!question.endsWith('?') || question.split('?').length !== 2) {
      report('adr/context-question-shape', last, {});
    }
  } else {
    report('adr/context-question-missing', last ?? section.heading, {});
  }
  const facts = last?.type === 'paragraph' ? section.blocks.slice(0, -1) : section.blocks;
  let lists = 0;
  for (const block of facts) {
    if (block.type === 'list') {
      lists += 1;
      for (const item of block.children) {
        const paragraph = singleParagraph(item);
        if (paragraph === null) {
          report('adr/context-fact-shape', item, {});
        } else if (!isSourced(paragraph, grammar)) {
          report('adr/context-fact-unsourced', item, {});
        }
      }
    } else if (block.type !== 'code') {
      report('adr/context-stray-block', block, {});
    }
  }
  if (lists === 0) {
    report('adr/context-facts-missing', section.heading, {});
  }
}
