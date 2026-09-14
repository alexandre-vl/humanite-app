import type { BodyContext } from '../body.ts';
import { plainText } from '../markdown.ts';
import { singleList, singleParagraph } from '../outline.ts';

/** Notes in one bullet list, with exactly one `Réévaluation : …` trigger. */
export function checkMoreInformation({ sections, grammar, report }: BodyContext): void {
  const section = sections.moreInformation;
  const found = singleList(section.blocks, section.heading);
  if (found.kind === 'problem') {
    report('adr/reevaluation-list', found.at, {});
    return;
  }
  const triggers = found.list.children.filter((item) => {
    const paragraph = singleParagraph(item);
    return paragraph !== null && grammar.isReevaluation(plainText(paragraph, 'keep'));
  });
  if (triggers.length !== 1) {
    report('adr/reevaluation-count', triggers[1] ?? found.list, {
      count: triggers.length,
      label: grammar.reevaluationLine('…'),
    });
  }
}
