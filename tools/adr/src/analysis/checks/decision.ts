import type { Paragraph } from 'mdast';
import type { BodyContext } from '../body.ts';
import { plainText, walk } from '../markdown.ts';
import type { Labelled } from '../outline.ts';
import { readLabelledItems, singleParagraph } from '../outline.ts';

export type Decision = Readonly<{
  /** Name of the chosen option, `null` when the first sentence cannot be read. */
  chosen: string | null;
  chosenParagraph: Paragraph | null;
  /** Rules with a valid label, `null` when the list is missing or one label is wrong. */
  rules: readonly Labelled[] | null;
  /** Paragraph of every item of the rule list, labelled or not: keywords belong there and nowhere else. */
  ruleParagraphs: ReadonlySet<Paragraph>;
}>;

/** The chosen option among the studied ones, then the rules `**R1** — …`, then only code blocks or tables. */
export function readDecision(context: BodyContext, options: readonly string[] | null): Decision {
  const { tree, sections, spec, grammar, report } = context;
  const section = sections.decision;
  const [first, rulesBlock, ...rest] = section.blocks;
  const chosenParagraph = first?.type === 'paragraph' ? first : null;
  const chosen = chosenParagraph === null ? null : grammar.matchChosenOption(plainText(chosenParagraph, 'keep'));
  if (chosen === null) {
    report('adr/decision-chosen-shape', first ?? section.heading, { template: grammar.chosenOptionTemplate });
  } else if (options !== null && !options.includes(chosen)) {
    report('adr/decision-chosen-unknown', chosenParagraph ?? section.heading, { name: chosen });
  }
  for (const node of walk(tree)) {
    if (
      node.type === 'paragraph' &&
      node !== chosenParagraph &&
      grammar.startsLikeChosenOption(plainText(node, 'keep'))
    ) {
      report('adr/decision-chosen-duplicate', node, { label: spec.labels.chosenOption });
    }
  }
  let rules: readonly Labelled[] | null = null;
  const ruleParagraphs = new Set<Paragraph>();
  if (rulesBlock?.type === 'list' && rulesBlock.ordered !== true) {
    for (const item of rulesBlock.children) {
      const paragraph = singleParagraph(item);
      if (paragraph !== null) {
        ruleParagraphs.add(paragraph);
      }
    }
    rules = readLabelledItems(rulesBlock.children, spec.labels.rulePrefix, grammar.labelledText, (item, label) => {
      report('adr/decision-rule-label', item, { label, separator: spec.labels.separator });
    });
  } else {
    report('adr/decision-rules-missing', rulesBlock ?? first ?? section.heading, {
      label: `${spec.labels.rulePrefix}1`,
      separator: spec.labels.separator,
    });
  }
  for (const block of rest) {
    if (block.type !== 'code' && block.type !== 'table') {
      report('adr/decision-trailing-block', block, {});
    }
  }
  return { chosen, chosenParagraph, rules, ruleParagraphs };
}
