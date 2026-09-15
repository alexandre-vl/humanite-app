import type { Paragraph } from 'mdast';
import type { BodyContext } from '../body.ts';
import { plainText, walk } from '../markdown.ts';
import { singleParagraph } from '../outline.ts';
import { namesSource, readLink } from './references.ts';

/** A fact names its source: a link a reader can follow, a command in inline code, or an ADR. */
const isSourced = (paragraph: Paragraph, { directory, spec, grammar }: BodyContext): boolean =>
  [...walk(paragraph)].some(
    (node) => node.type === 'inlineCode' || (node.type === 'link' && namesSource(readLink(node.url, directory, spec))),
  ) || grammar.scanMentions(plainText(paragraph, 'keep')).valid.length > 0;

/** Sourced facts in bullet lists, then the problem as a single question. */
export function checkContext(context: BodyContext): void {
  const { sections, spec, report } = context;
  const section = sections.context;
  const last = section.blocks.at(-1);
  const questionMark = spec.punctuation.questionMark;
  if (last?.type === 'paragraph') {
    // Inline code is masked: `a?.b` in a question names an operator, it does not end a sentence.
    const question = plainText(last, 'mask');
    if (!question.endsWith(questionMark) || question.split(questionMark).length !== 2) {
      report('adr/context-question-shape', last, { questionMark });
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
        } else if (!isSourced(paragraph, context)) {
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
