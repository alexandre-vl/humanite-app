import type { ListItem, Nodes, Paragraph, RootContent } from 'mdast';
import type { Valence } from '../../spec/formats/types.ts';
import type { BodyContext } from '../body.ts';
import { plainText } from '../markdown.ts';
import { singleList, singleParagraph } from '../outline.ts';

export type Argument = Readonly<{ valence: Valence; paragraph: Paragraph; item: ListItem }>;

/** Bullets `Bien, parce que …`, `Neutre, parce que …` or `Mauvais, parce que …`; `null` when one cannot be read. */
function readArguments(
  { grammar, report }: BodyContext,
  blocks: readonly RootContent[],
  anchor: Nodes,
  section: string,
): readonly Argument[] | null {
  const found = singleList(blocks, anchor);
  if (found.kind === 'problem') {
    report('adr/argument-list', found.at, { section });
    return null;
  }
  const items = found.list.children.flatMap((item): Argument[] => {
    const paragraph = singleParagraph(item);
    const valence = paragraph === null ? null : grammar.matchValence(plainText(paragraph, 'keep'));
    if (paragraph === null || valence === null) {
      report('adr/argument-shape', item, { template: grammar.valenceTemplate });
      return [];
    }
    return [{ valence, paragraph, item }];
  });
  return items.length === found.list.children.length ? items : null;
}

export type ArgumentsReading = Readonly<{
  /** Arguments of every option whose list could be read whole. */
  byOption: readonly (readonly Argument[])[];
  /** Every option subsection could be read. */
  complete: boolean;
}>;

/** Consequences name an effect and a cost; the chosen option has a good argument, every other one a bad argument. */
export function checkArguments(
  context: BodyContext,
  options: readonly string[] | null,
  chosen: string | null,
): ArgumentsReading {
  const { sections, spec, report } = context;
  const consequences = sections.decision.subsections.find((subsection) => subsection.title === spec.consequences);
  if (consequences !== undefined) {
    const effects = readArguments(context, consequences.blocks, consequences.heading, consequences.title);
    if (
      effects !== null &&
      !(effects.some((effect) => effect.valence === 'good') && effects.some((effect) => effect.valence === 'bad'))
    ) {
      report('adr/consequences-balance', consequences.heading, { good: spec.valences.good, bad: spec.valences.bad });
    }
  }
  const byOption: (readonly Argument[])[] = [];
  let complete = true;
  for (const subsection of sections.prosAndCons.subsections) {
    const optionArguments = readArguments(context, subsection.blocks, subsection.heading, subsection.title);
    if (optionArguments === null) {
      complete = false;
      continue;
    }
    byOption.push(optionArguments);
    if (options === null || chosen === null || !options.includes(chosen) || !options.includes(subsection.title)) {
      continue;
    }
    if (subsection.title === chosen) {
      if (!optionArguments.some((argument) => argument.valence === 'good')) {
        report('adr/option-chosen-without-good', subsection.heading, { name: chosen, good: spec.valences.good });
      }
    } else if (!optionArguments.some((argument) => argument.valence === 'bad')) {
      report('adr/option-rejected-without-bad', subsection.heading, { name: subsection.title, bad: spec.valences.bad });
    }
  }
  return { byOption, complete };
}
