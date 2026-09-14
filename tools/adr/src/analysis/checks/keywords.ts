import type { Paragraph } from 'mdast';
import type { RuleLevel } from '../../spec/formats/types.ts';
import type { BodyContext } from '../body.ts';
import { textSpan, walk } from '../markdown.ts';

/**
 * Capitalised BCP 14 keywords: exactly one in each rule, none elsewhere, never a forbidden modal word nor a negation
 * that mixes case. Returns the level of every rule paragraph that carries exactly one keyword.
 */
export function checkKeywords(
  { tree, grammar, report }: BodyContext,
  ruleParagraphs: ReadonlySet<Paragraph>,
): ReadonlyMap<Paragraph, RuleLevel> {
  const levels = new Map<Paragraph, RuleLevel>();
  for (const node of walk(tree)) {
    if (node.type !== 'paragraph' && node.type !== 'heading' && node.type !== 'tableCell') {
      continue;
    }
    const span = textSpan(node, 'mask');
    const scan = grammar.scanKeywords(span.text);
    for (const match of scan.forbidden) {
      report('adr/keyword-forbidden', span.locate(match.index), { word: match.text, keywords: grammar.keywordList });
    }
    for (const match of scan.negations) {
      report('adr/keyword-negation', span.locate(match.index), { text: match.text, expected: match.value });
    }
    if (node.type === 'paragraph' && ruleParagraphs.has(node)) {
      const [level, ...others] = scan.levels;
      if (level !== undefined && others.length === 0) {
        levels.set(node, level.value);
      } else if (scan.negations.length === 0) {
        report('adr/keyword-count', node, { count: scan.levels.length, keywords: grammar.keywordList });
      }
    } else {
      for (const match of scan.levels) {
        report('adr/keyword-outside-rule', span.locate(match.index), { word: match.text });
      }
    }
  }
  return levels;
}
