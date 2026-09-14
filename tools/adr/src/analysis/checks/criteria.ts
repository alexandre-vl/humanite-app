import type { BodyContext } from '../body.ts';
import type { Labelled } from '../outline.ts';
import { readLabelledItems, singleList } from '../outline.ts';

/** Criteria `**C1** — …` to `**Cn** — …` in one bullet list; `null` when the list cannot be read whole. */
export function readCriteria({ sections, spec, grammar, report }: BodyContext): readonly Labelled[] | null {
  const section = sections.criteria;
  const found = singleList(section.blocks, section.heading);
  if (found.kind === 'problem') {
    report('adr/criteria-list', found.at, {});
    return null;
  }
  return readLabelledItems(found.list.children, spec.labels.criterionPrefix, grammar.labelledText, (item, label) => {
    report('adr/criteria-label', item, { label, separator: spec.labels.separator });
  });
}
