import type { BodyContext } from '../body.ts';
import { plainText } from '../markdown.ts';
import { singleList, singleParagraph } from '../outline.ts';

/** Names of the studied options, each with its own argument subsection in the same order; `null` when unreadable. */
export function readOptions({ sections, spec, report }: BodyContext): readonly string[] | null {
  const section = sections.options;
  const found = singleList(section.blocks, section.heading);
  if (found.kind === 'problem') {
    report('adr/options-list', found.at, {});
    return null;
  }
  const names: string[] = [];
  let readable = true;
  for (const item of found.list.children) {
    const paragraph = singleParagraph(item);
    const name = paragraph === null ? '' : plainText(paragraph, 'keep');
    if (name === '' || /[«»]/u.test(name)) {
      report('adr/options-name', item, {});
      readable = false;
    } else if (names.includes(name)) {
      report('adr/options-duplicate', item, { name });
      readable = false;
    } else {
      names.push(name);
    }
  }
  if (!readable) {
    return null;
  }
  if (names.length < spec.limits.minOptions) {
    report('adr/options-too-few', found.list, { count: names.length, min: spec.limits.minOptions });
  }
  const subsections = sections.prosAndCons.subsections;
  const titles = subsections.map((subsection) => subsection.title);
  const mismatch = names.findIndex((name, index) => titles[index] !== name);
  if (mismatch !== -1 || titles.length !== names.length) {
    const at = subsections[mismatch === -1 ? names.length : mismatch]?.heading ?? sections.prosAndCons.heading;
    report('adr/options-subsections', at, { found: titles, expected: names });
  }
  return names;
}
