import type { Position } from '@huma/kit/diagnostics';
import { START } from '@huma/kit/diagnostics';
import type { Heading, List, ListItem, Nodes, Paragraph, RootContent } from 'mdast';
import type { FormatSpec, SectionKey } from '../spec/formats/types.ts';
import { plainText } from './markdown.ts';
import type { FileReport } from './report.ts';
import { slugify } from './slug.ts';

export type Subsection = Readonly<{ heading: Heading; title: string; blocks: readonly RootContent[] }>;

export type Section = Subsection & Readonly<{ subsections: readonly Subsection[] }>;

export type SectionMap = Readonly<Record<SectionKey, Section>>;

type MutableSection = { heading: Heading; title: string; blocks: RootContent[]; subsections: MutableSubsection[] };

type MutableSubsection = { heading: Heading; title: string; blocks: RootContent[] };

/** The title heading and the level 2 sections of a body, with the structural findings on the way. */
export function outline(
  nodes: readonly RootContent[],
  report: FileReport,
): Readonly<{ title: Heading | null; sections: readonly Section[] }> {
  let title: Heading | null = null;
  const sections: MutableSection[] = [];
  const [first] = nodes;
  if (first === undefined) {
    report('adr/title-missing', START, {});
  } else if (first.type !== 'heading' || first.depth !== 1) {
    report(
      nodes.some((node) => node.type === 'heading' && node.depth === 1) ? 'adr/title-not-first' : 'adr/title-missing',
      first,
      {},
    );
  }
  for (const node of nodes) {
    if (node.type === 'heading' && node.depth === 1) {
      if (title === null && sections.length === 0) {
        title = node;
      } else {
        report('adr/title-duplicate', node, {});
      }
      continue;
    }
    if (node.type === 'heading' && node.depth === 2) {
      sections.push({ heading: node, title: plainText(node, 'keep'), blocks: [], subsections: [] });
      continue;
    }
    const section = sections.at(-1);
    if (section === undefined) {
      if (title !== null) {
        report('adr/section-content-before', node, {});
      }
    } else if (node.type === 'heading' && node.depth === 3) {
      section.subsections.push({ heading: node, title: plainText(node, 'keep'), blocks: [] });
    } else {
      (section.subsections.at(-1) ?? section).blocks.push(node);
    }
  }
  return { title, sections };
}

/** Sections by key when the body has exactly the sections of the format, in order; `null` otherwise. */
export function mapSections(
  sections: readonly Section[],
  spec: FormatSpec,
  anchor: Nodes | Position,
  report: FileReport,
): SectionMap | null {
  const expected = spec.sections.map((section) => section.title);
  const found = sections.map((section) => section.title);
  const mismatch = expected.findIndex((title, index) => found[index] !== title);
  if (mismatch !== -1 || found.length !== expected.length) {
    const at = sections[mismatch === -1 ? expected.length : mismatch]?.heading ?? anchor;
    report('adr/section-order', at, { found, expected });
    return null;
  }
  const byKey = new Map(spec.sections.map((definition, index) => [definition.key, sections[index]] as const));
  const sectionOf = (key: SectionKey): Section => {
    const section = byKey.get(key);
    if (section === undefined) {
      throw new Error(`Format ${String(spec.version)} : section ${key} absente de sa liste de sections`);
    }
    return section;
  };
  const result: SectionMap = {
    context: sectionOf('context'),
    criteria: sectionOf('criteria'),
    options: sectionOf('options'),
    decision: sectionOf('decision'),
    prosAndCons: sectionOf('prosAndCons'),
    moreInformation: sectionOf('moreInformation'),
  };
  for (const key of ['context', 'criteria', 'options', 'moreInformation'] as const) {
    for (const subsection of result[key].subsections) {
      report('adr/section-subsection', subsection.heading, {
        subsection: subsection.title,
        section: result[key].title,
      });
    }
  }
  const decisionSubsections = result.decision.subsections.map((subsection) => subsection.title);
  if (decisionSubsections.length !== 1 || decisionSubsections[0] !== spec.consequences) {
    report(
      'adr/section-consequences',
      result.decision.subsections[1]?.heading ?? result.decision.subsections[0]?.heading ?? result.decision.heading,
      {
        found: decisionSubsections,
        expected: spec.consequences,
      },
    );
  }
  const [stray] = result.prosAndCons.blocks;
  if (stray !== undefined) {
    report('adr/section-pros-and-cons-text', stray, {});
  }
  return result;
}

const TITLE_CONTENT = new Set(['text', 'inlineCode']);

/** The title text, with its shape checked and the file name compared with its slug. */
export function readTitle(
  heading: Heading,
  file: Readonly<{ slug: string; expectedName: (slug: string) => string }>,
  spec: FormatSpec,
  report: FileReport,
): string {
  if (!heading.children.every((child) => TITLE_CONTENT.has(child.type))) {
    report('adr/title-rich', heading, {});
  }
  const title = plainText(heading, 'keep');
  const prose = plainText(heading, 'mask');
  const slug = slugify(title);
  const length = Array.from(title).length;
  if (slug === '') {
    report('adr/title-no-letter', heading, {});
  }
  if (length > spec.title.maxCodePoints) {
    report('adr/title-too-long', heading, { length, max: spec.title.maxCodePoints });
  }
  for (const character of spec.title.forbiddenCharacters.filter((candidate) => prose.includes(candidate))) {
    report('adr/title-forbidden-character', heading, { character });
  }
  const last = Array.from(title).at(-1);
  if (last !== undefined && spec.title.finalPunctuation.includes(last)) {
    report('adr/title-final-punctuation', heading, { character: last });
  }
  if (slug !== '' && slug !== file.slug) {
    report('adr/slug-mismatch', heading, { expected: file.expectedName(slug) });
  }
  return title;
}

export function singleParagraph(item: ListItem): Paragraph | null {
  const [only, ...rest] = item.children;
  return rest.length === 0 && only?.type === 'paragraph' ? only : null;
}

/** The only block of `blocks` when it is a bullet list; otherwise the node to blame. */
export function singleList(
  blocks: readonly RootContent[],
  anchor: Nodes,
): Readonly<{ kind: 'list'; list: List }> | Readonly<{ kind: 'problem'; at: Nodes }> {
  const [list, ...rest] = blocks;
  if (list?.type === 'list' && list.ordered !== true && rest.length === 0) {
    return { kind: 'list', list };
  }
  return { kind: 'problem', at: rest[0] ?? list ?? anchor };
}

export type Labelled = Readonly<{ number: number; paragraph: Paragraph; item: ListItem }>;

/** Items labelled `**P1** — text`, `**P2** — text`… in order; the items whose label is wrong are passed to `onWrong`. */
export function readLabelledItems(
  items: readonly ListItem[],
  prefix: string,
  labelledText: (text: string, label: string) => string | null,
  onWrong: (item: ListItem, label: string) => void,
): readonly Labelled[] | null {
  const labelled = items.flatMap((item, index): Labelled[] => {
    const label = `${prefix}${String(index + 1)}`;
    const paragraph = singleParagraph(item);
    const [first] = paragraph?.children ?? [];
    if (
      paragraph === null ||
      first?.type !== 'strong' ||
      plainText(first, 'keep') !== label ||
      labelledText(plainText(paragraph, 'keep'), label) === null
    ) {
      onWrong(item, label);
      return [];
    }
    return [{ number: index + 1, paragraph, item }];
  });
  return labelled.length === items.length ? labelled : null;
}
