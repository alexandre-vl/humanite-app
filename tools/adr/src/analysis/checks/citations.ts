import type { Paragraph } from 'mdast';
import type { BodyContext } from '../body.ts';
import { textSpan, walk } from '../markdown.ts';
import type { Labelled } from '../outline.ts';
import type { ArgumentsReading } from './arguments.ts';

/**
 * Criteria cited as `(C1)` or `(C1, C2)`: every citation names an existing criterion, the chosen option and every
 * argument cite one, and every criterion is cited by an argument.
 */
export function checkCitations(
  { tree, source, grammar, report }: BodyContext,
  criteria: readonly Labelled[],
  chosenParagraph: Paragraph | null,
  argumentsReading: ArgumentsReading,
): void {
  const first = grammar.criterionLabel(1);
  const last = grammar.criterionLabel(criteria.length);
  const example = grammar.citationExample;
  for (const node of walk(tree)) {
    if (node.type !== 'paragraph' && node.type !== 'heading' && node.type !== 'tableCell') {
      continue;
    }
    const span = textSpan(node, 'mask', source);
    const scan = grammar.scanCitations(span.text);
    for (const match of scan.malformed) {
      report('adr/citation-malformed', span.locate(match.index), { text: match.text, example });
    }
    for (const citation of scan.citations) {
      for (const number of citation.numbers.filter((cited) => cited > criteria.length)) {
        report('adr/citation-unknown', span.locate(citation.index), {
          label: grammar.criterionLabel(number),
          first,
          last,
        });
      }
    }
  }
  if (
    chosenParagraph !== null &&
    grammar.scanCitations(textSpan(chosenParagraph, 'mask', null).text).numbers.length === 0
  ) {
    report('adr/citation-chosen-missing', chosenParagraph, { example });
  }
  const cited = new Set<number>();
  for (const argument of argumentsReading.byOption.flat()) {
    const numbers = grammar.scanCitations(textSpan(argument.paragraph, 'mask', null).text).numbers;
    if (numbers.length === 0) {
      report('adr/citation-argument-missing', argument.item, { example });
    }
    numbers.forEach((number) => cited.add(number));
  }
  if (!argumentsReading.complete) {
    return;
  }
  for (const criterion of criteria.filter(({ number }) => !cited.has(number))) {
    report('adr/citation-criterion-unused', criterion.item, { label: grammar.criterionLabel(criterion.number) });
  }
}
