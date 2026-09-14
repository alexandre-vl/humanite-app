import type { Heading, ListItem, Nodes, Paragraph, Root, RootContent } from 'mdast';
import type { CheckCode, Diagnostic, Position } from './diagnostics.ts';
import { diagnostic, START } from './diagnostics.ts';
import { analyzeFrontMatter } from './frontmatter.ts';
import {
  ADR_MENTION,
  citedCriteria,
  isReevaluation,
  labelledText,
  matchChosenOption,
  matchValence,
  scanKeywords,
  startsLikeChosenOption,
} from './grammar.ts';
import { countWords, parseMarkdown, plainText, positionOf, walk } from './markdown.ts';
import type { AdrNumber, FrontMatter, RepoPath, RuleId } from './model.ts';
import { adrNumber, isRuleId } from './model.ts';
import { slugify } from './slug.ts';
import type { RuleLevel, SectionKey, Valence } from './spec.ts';
import { BINDING_LEVELS, CONSEQUENCES_TITLE, LABELS, LIMITS, SECTION_ORDER, SECTIONS } from './spec.ts';

export type AdrSource = Readonly<{ path: RepoPath; number: AdrNumber; slug: string; bytes: Uint8Array }>;

export type Rule = Readonly<{ id: RuleId; level: RuleLevel | null; position: Position }>;

export type LinkReference = Readonly<{ url: string; position: Position }>;

export type AdrMention = Readonly<{ number: AdrNumber; position: Position }>;

export type AdrDocument = Readonly<{
  path: RepoPath;
  number: AdrNumber;
  slug: string;
  tree: Root;
  frontMatter: FrontMatter | null;
  title: string | null;
  /** `null` when the decision section cannot be read. */
  rules: readonly Rule[] | null;
  links: readonly LinkReference[];
  mentions: readonly AdrMention[];
}>;

export type DocumentAnalysis = Readonly<{ document: AdrDocument | null; diagnostics: readonly Diagnostic[] }>;

type Report = (code: CheckCode, at: Nodes | Position, message: string) => void;

type Subsection = { heading: Heading; title: string; blocks: RootContent[] };

type Section = Subsection & { subsections: Subsection[] };

type Labelled = Readonly<{ number: number; paragraph: Paragraph; item: ListItem }>;

type Argument = Readonly<{ valence: Valence; paragraph: Paragraph; item: ListItem }>;

const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

const isPosition = (at: Nodes | Position): at is Position => !('type' in at);

function firstDecomposition(text: string): Position | null {
  if (text === text.normalize('NFC')) {
    return null;
  }
  let line = 1;
  let column = 1;
  let previous = '';
  for (const character of text) {
    const pair = previous + character;
    if (/\p{M}/u.test(character) && pair.normalize('NFC') !== pair) {
      return { line, column: column - 1 };
    }
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    previous = character;
  }
  return START;
}

const ALLOWED_NODES: ReadonlySet<string> = new Set([
  'root',
  'yaml',
  'heading',
  'paragraph',
  'list',
  'listItem',
  'table',
  'tableRow',
  'tableCell',
  'code',
  'text',
  'emphasis',
  'strong',
  'inlineCode',
  'link',
]);

function checkSubset(tree: Root, text: string, report: Report): void {
  const code = 'adr/markdown-subset';
  for (const node of walk(tree)) {
    if (!ALLOWED_NODES.has(node.type)) {
      report(code, node, `élément Markdown interdit : ${node.type}`);
    } else if (node.type === 'heading' && node.depth > 3) {
      report(code, node, `titre de niveau ${String(node.depth)} interdit : trois niveaux au plus`);
    } else if (node.type === 'listItem' && typeof node.checked === 'boolean') {
      report(code, node, 'case à cocher interdite');
    } else if (node.type === 'link' && typeof node.title === 'string') {
      report(code, node, 'titre de lien interdit');
    } else if (node.type === 'code') {
      const offset = node.position?.start.offset ?? 0;
      const fence = text.slice(offset, offset + 3);
      if (fence !== '```' && fence !== '~~~') {
        report(code, node, 'bloc de code indenté interdit : utiliser une clôture ```');
      } else if (typeof node.lang !== 'string' || node.lang === '') {
        report(code, node, 'bloc de code sans langage');
      }
    }
  }
}

function splitSections(
  nodes: readonly RootContent[],
  report: Report,
): Readonly<{ title: Heading | null; sections: Section[] }> {
  let title: Heading | null = null;
  const sections: Section[] = [];
  if (nodes.length === 0) {
    report('adr/title', START, 'titre de niveau 1 absent');
  }
  nodes.forEach((node, index) => {
    if (node.type === 'heading' && node.depth === 1) {
      if (index === 0) {
        title = node;
      } else {
        report('adr/title', node, 'un seul titre de niveau 1, en tête du document');
      }
      return;
    }
    if (index === 0) {
      report('adr/title', node, 'titre de niveau 1 attendu juste après l’en-tête');
    }
    if (node.type === 'heading' && node.depth === 2) {
      sections.push({ heading: node, title: plainText(node, 'keep'), blocks: [], subsections: [] });
      return;
    }
    const section = sections.at(-1);
    if (section === undefined) {
      report('adr/sections', node, 'contenu avant la première section');
    } else if (node.type === 'heading' && node.depth === 3) {
      section.subsections.push({ heading: node, title: plainText(node, 'keep'), blocks: [] });
    } else {
      (section.subsections.at(-1) ?? section).blocks.push(node);
    }
  });
  return { title, sections };
}

type SectionOf = (key: SectionKey) => Section;

function validateSections(sections: readonly Section[], anchor: Nodes | Position, report: Report): SectionOf | null {
  const code = 'adr/sections';
  const expected = SECTION_ORDER.map((key) => SECTIONS[key]);
  const found = sections.map((section) => section.title);
  const mismatch = expected.findIndex((title, index) => found[index] !== title);
  if (mismatch !== -1 || found.length !== expected.length) {
    const at = sections[mismatch === -1 ? expected.length : mismatch]?.heading ?? anchor;
    report(
      code,
      at,
      `sections attendues, dans l’ordre : ${expected.join(' · ')} ; trouvées : ${found.length === 0 ? 'aucune' : found.join(' · ')}`,
    );
    return null;
  }
  const sectionOf: SectionOf = (key) => {
    const section = sections[SECTION_ORDER.indexOf(key)];
    if (section === undefined) {
      throw new Error(`Section ${key} absente après validation`);
    }
    return section;
  };
  let valid = true;
  for (const key of ['context', 'criteria', 'options', 'moreInformation'] as const) {
    const [unexpected] = sectionOf(key).subsections;
    if (unexpected !== undefined) {
      report(code, unexpected.heading, `sous-section inattendue dans « ${SECTIONS[key]} »`);
      valid = false;
    }
  }
  const decision = sectionOf('decision');
  if (decision.subsections.length !== 1 || decision.subsections[0]?.title !== CONSEQUENCES_TITLE) {
    report(
      code,
      decision.subsections[0]?.heading ?? decision.heading,
      `une seule sous-section « ${CONSEQUENCES_TITLE} » sous « ${SECTIONS.decision} »`,
    );
    valid = false;
  }
  const [straySentence] = sectionOf('prosAndCons').blocks;
  if (straySentence !== undefined) {
    report(code, straySentence, `« ${SECTIONS.prosAndCons} » ne contient que les sous-sections des options`);
    valid = false;
  }
  return valid ? sectionOf : null;
}

function readTitle(heading: Heading | null, source: AdrSource, report: Report): string | null {
  if (heading === null) {
    return null;
  }
  const code = 'adr/title';
  if (!heading.children.every((child) => child.type === 'text' || child.type === 'inlineCode')) {
    report(code, heading, 'titre en texte simple : ni emphase ni lien');
  }
  const title = plainText(heading, 'keep');
  const slug = slugify(title);
  const length = Array.from(title).length;
  if (slug === '') {
    report(code, heading, 'titre sans lettre ni chiffre');
  }
  if (length > LIMITS.titleCodePoints) {
    report(code, heading, `titre de ${String(length)} caractères : ${String(LIMITS.titleCodePoints)} au plus`);
  }
  if (title.includes(' : ')) {
    report(code, heading, 'titre sans « : » : un groupe nominal qui énonce la décision');
  }
  if (/[.!?:;,…]$/u.test(title)) {
    report(code, heading, 'titre sans ponctuation finale');
  }
  if (slug !== '' && slug !== source.slug) {
    report('adr/slug', heading, `nom de fichier attendu : ${String(source.number).padStart(4, '0')}-${slug}.md`);
  }
  return title;
}

function singleParagraph(item: ListItem): Paragraph | null {
  const [only, ...rest] = item.children;
  return rest.length === 0 && only?.type === 'paragraph' ? only : null;
}

function singleList(blocks: readonly RootContent[], anchor: Nodes, code: CheckCode, what: string, report: Report) {
  const [list, ...rest] = blocks;
  if (rest.length > 0 || list?.type !== 'list' || list.ordered === true) {
    report(code, rest[0] ?? list ?? anchor, `${what} : une seule liste à puces`);
    return null;
  }
  return list;
}

function readLabelledItems(
  items: readonly ListItem[],
  prefix: 'C' | 'R',
  code: CheckCode,
  report: Report,
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
      report(code, item, `puce attendue : **${label}**${LABELS.labelSeparator}texte`);
      return [];
    }
    return [{ number: index + 1, paragraph, item }];
  });
  return labelled.length === items.length ? labelled : null;
}

function checkContext(section: Section, report: Report): void {
  const code = 'adr/context';
  const last = section.blocks.at(-1);
  if (last?.type === 'paragraph') {
    const question = plainText(last, 'keep');
    if (!question.endsWith('?') || question.split('?').length !== 2) {
      report(code, last, 'le problème tient en une seule question, terminée par « ? »');
    }
  } else {
    report(code, last ?? section.heading, 'la section se termine par la question du problème');
  }
  const facts = last?.type === 'paragraph' ? section.blocks.slice(0, -1) : section.blocks;
  let lists = 0;
  for (const block of facts) {
    if (block.type === 'list') {
      lists += 1;
      for (const item of block.children) {
        const sourced = [...walk(item)].some(
          (node) =>
            node.type === 'link' ||
            node.type === 'inlineCode' ||
            (node.type === 'text' && new RegExp(ADR_MENTION.source, 'u').test(node.value)),
        );
        if (!sourced) {
          report(code, item, 'fait sans source : lien, code en ligne ou ADR-NNNN');
        }
      }
    } else if (block.type !== 'code') {
      report(code, block, 'faits en listes à puces ; le seul paragraphe est la question finale');
    }
  }
  if (lists === 0) {
    report(code, section.heading, 'au moins une liste de faits sourcés');
  }
}

function readOptions(section: Section, prosAndCons: Section, report: Report): readonly string[] | null {
  const code = 'adr/options';
  const list = singleList(section.blocks, section.heading, code, 'options', report);
  if (list === null) {
    return null;
  }
  const names: string[] = [];
  for (const item of list.children) {
    const paragraph = singleParagraph(item);
    const name = paragraph === null ? '' : plainText(paragraph, 'keep');
    if (name === '' || /[«»]/u.test(name)) {
      report(code, item, 'une option est un nom seul, sans « »');
      return null;
    }
    if (names.includes(name)) {
      report(code, item, `option en double : ${name}`);
      return null;
    }
    names.push(name);
  }
  if (names.length < LIMITS.minOptions) {
    report(code, list, `au moins ${String(LIMITS.minOptions)} options réellement étudiées`);
    return null;
  }
  const headings = prosAndCons.subsections.map((subsection) => subsection.title);
  const mismatch = names.findIndex((name, index) => headings[index] !== name);
  if (mismatch !== -1 || headings.length !== names.length) {
    const at = prosAndCons.subsections[mismatch === -1 ? names.length : mismatch]?.heading ?? prosAndCons.heading;
    report(code, at, `sous-sections attendues, dans l’ordre des options : ${names.join(' · ')}`);
    return null;
  }
  return names;
}

type Decision = Readonly<{ chosen: string; paragraph: Paragraph; rules: readonly Labelled[] | null }>;

function readDecision(
  tree: Root,
  section: Section,
  options: readonly string[] | null,
  report: Report,
): Decision | null {
  const code = 'adr/decision';
  const choices = [...walk(tree)].filter(
    (node): node is Paragraph => node.type === 'paragraph' && startsLikeChosenOption(plainText(node, 'keep')),
  );
  for (const extra of choices.slice(1)) {
    report(code, extra, `une seule « ${LABELS.chosenOption} » par ADR`);
  }
  const [choice, rulesBlock, ...rest] = section.blocks;
  const chosen = choice?.type === 'paragraph' ? matchChosenOption(plainText(choice, 'keep')) : null;
  if (chosen === null || choice?.type !== 'paragraph') {
    report(
      code,
      choice ?? section.heading,
      `première phrase attendue : ${LABELS.chosenOption} : « option », ${LABELS.because} …`,
    );
    return null;
  }
  if (options !== null && !options.includes(chosen)) {
    report(code, choice, `option retenue absente des options étudiées : ${chosen}`);
  }
  let rules: readonly Labelled[] | null = null;
  if (rulesBlock?.type === 'list' && rulesBlock.ordered !== true) {
    rules = readLabelledItems(rulesBlock.children, 'R', code, report);
  } else {
    report(code, rulesBlock ?? choice, 'liste des règles **R1** — … attendue après l’option retenue');
  }
  for (const block of rest) {
    if (block.type !== 'code' && block.type !== 'table') {
      report(code, block, 'après les règles, seulement des blocs de code ou des tableaux');
    }
  }
  return { chosen, paragraph: choice, rules };
}

function checkKeywords(
  tree: Root,
  rules: readonly Labelled[] | null,
  report: Report,
): ReadonlyMap<Paragraph, RuleLevel> {
  const code = 'adr/keywords';
  const ruleParagraphs = new Set(rules?.map((rule) => rule.paragraph));
  const levels = new Map<Paragraph, RuleLevel>();
  for (const node of walk(tree)) {
    if (node.type !== 'paragraph' && node.type !== 'heading' && node.type !== 'tableCell') {
      continue;
    }
    const scan = scanKeywords(plainText(node, 'mask'));
    for (const word of scan.forbidden) {
      report(code, node, `mot-clé interdit : ${word} ; une règle dit DOIT, NE DOIT PAS ou PEUT`);
    }
    if (node.type === 'paragraph' && ruleParagraphs.has(node)) {
      const [level, ...others] = scan.levels;
      if (level === undefined || others.length > 0) {
        report(
          code,
          node,
          `une règle contient exactement un mot-clé DOIT, NE DOIT PAS ou PEUT : ${String(scan.levels.length)} trouvé(s)`,
        );
      } else {
        levels.set(node, level);
      }
    } else if (scan.levels.length > 0) {
      report(code, node, 'mot-clé en capitales hors d’une règle : l’écrire en minuscules ou en code');
    }
  }
  return levels;
}

function readArguments(
  blocks: readonly RootContent[],
  anchor: Nodes,
  what: string,
  report: Report,
): readonly Argument[] | null {
  const code = 'adr/valence';
  const list = singleList(blocks, anchor, code, what, report);
  if (list === null) {
    return null;
  }
  const result = list.children.flatMap((item): Argument[] => {
    const paragraph = singleParagraph(item);
    const valence = paragraph === null ? null : matchValence(plainText(paragraph, 'keep'));
    if (paragraph === null || valence === null) {
      report(code, item, `puce attendue : Bien, Neutre ou Mauvais, ${LABELS.because} …`);
      return [];
    }
    return [{ valence, paragraph, item }];
  });
  return result.length === list.children.length ? result : null;
}

function checkReevaluation(section: Section, report: Report): void {
  const code = 'adr/reevaluation';
  const list = singleList(section.blocks, section.heading, code, SECTIONS.moreInformation, report);
  if (list === null) {
    return;
  }
  const triggers = list.children.filter((item) => {
    const paragraph = singleParagraph(item);
    return paragraph !== null && isReevaluation(plainText(paragraph, 'keep'));
  });
  if (triggers.length !== 1) {
    report(code, triggers[1] ?? list, `exactement une puce « ${LABELS.reevaluation} : fait observable »`);
  }
}

function checkCitations(
  tree: Root,
  criteria: readonly Labelled[],
  decision: Decision | null,
  argumentsByOption: readonly (readonly Argument[])[],
  report: Report,
): void {
  const code = 'adr/criteria-cited';
  for (const node of walk(tree)) {
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      for (const number of citedCriteria(plainText(node, 'mask'))) {
        if (number < 1 || number > criteria.length) {
          report(code, node, `critère C${String(number)} inexistant : C1 à C${String(criteria.length)}`);
        }
      }
    }
  }
  if (decision !== null && citedCriteria(plainText(decision.paragraph, 'mask')).length === 0) {
    report(code, decision.paragraph, 'l’option retenue cite au moins un critère (Cn)');
  }
  const cited = new Set<number>();
  for (const argument of argumentsByOption.flat()) {
    const numbers = citedCriteria(plainText(argument.paragraph, 'mask'));
    if (numbers.length === 0) {
      report(code, argument.item, 'argument sans critère cité (Cn)');
    }
    numbers.forEach((number) => cited.add(number));
  }
  if (argumentsByOption.length === 0) {
    return;
  }
  for (const criterion of criteria) {
    if (!cited.has(criterion.number)) {
      report(code, criterion.item, `critère C${String(criterion.number)} jamais cité dans « ${SECTIONS.prosAndCons} »`);
    }
  }
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/iu;

function collectReferences(tree: Root): Readonly<{ links: LinkReference[]; mentions: AdrMention[] }> {
  const links: LinkReference[] = [];
  const mentions: AdrMention[] = [];
  for (const node of walk(tree)) {
    if (node.type === 'link') {
      links.push({ url: node.url, position: positionOf(node) });
    } else if (node.type === 'text' || node.type === 'inlineCode') {
      for (const match of node.value.matchAll(ADR_MENTION)) {
        mentions.push({ number: adrNumber(Number(match[1])), position: positionOf(node) });
      }
    }
  }
  return { links, mentions };
}

export const isExternalLink = (url: string): boolean => SCHEME.test(url);

export function analyzeAdr(source: AdrSource): DocumentAnalysis {
  const diagnostics: Diagnostic[] = [];
  const report: Report = (code, at, message) => {
    diagnostics.push(diagnostic(code, source.path, isPosition(at) ? at : positionOf(at), message));
  };

  let text: string;
  try {
    text = decoder.decode(source.bytes);
  } catch {
    report('adr/encoding', START, 'contenu qui n’est pas de l’UTF-8 valide');
    return { document: null, diagnostics };
  }
  if (text.startsWith('\u{FEFF}')) {
    report('adr/encoding', START, 'marque d’ordre des octets (BOM) interdite');
    text = text.slice(1);
  }
  const decomposed = firstDecomposition(text);
  if (decomposed !== null) {
    report('adr/encoding', decomposed, 'texte à normaliser en NFC');
    text = text.normalize('NFC');
  }

  const tree = parseMarkdown(text);
  checkSubset(tree, text, report);

  const [head, ...body] = tree.children;
  let frontMatter: FrontMatter | null = null;
  if (head?.type === 'yaml') {
    const analysis = analyzeFrontMatter(head, source.path);
    diagnostics.push(...analysis.diagnostics);
    ({ frontMatter } = analysis);
  } else {
    report('adr/frontmatter-yaml', START, 'en-tête YAML absent : le fichier commence par ---');
  }

  const structure = splitSections(head?.type === 'yaml' ? body : tree.children, report);
  const title = readTitle(structure.title, source, report);
  const sectionOf = validateSections(structure.sections, structure.title ?? START, report);

  let rules: Rule[] | null = null;
  if (sectionOf !== null) {
    checkContext(sectionOf('context'), report);
    const criteriaList = singleList(
      sectionOf('criteria').blocks,
      sectionOf('criteria').heading,
      'adr/criteria',
      SECTIONS.criteria,
      report,
    );
    const criteria =
      criteriaList === null ? null : readLabelledItems(criteriaList.children, 'C', 'adr/criteria', report);
    const options = readOptions(sectionOf('options'), sectionOf('prosAndCons'), report);
    const decision = readDecision(tree, sectionOf('decision'), options, report);
    const levels = checkKeywords(tree, decision?.rules ?? null, report);
    if (decision !== null && decision.rules !== null) {
      rules = decision.rules.flatMap(({ number, paragraph }): Rule[] => {
        const id = `R${String(number)}`;
        return isRuleId(id) ? [{ id, level: levels.get(paragraph) ?? null, position: positionOf(paragraph) }] : [];
      });
      if (
        rules.every((rule) => rule.level !== null) &&
        !rules.some((rule) => BINDING_LEVELS.some((level) => level === rule.level))
      ) {
        report('adr/decision', decision.paragraph, 'au moins une règle DOIT ou NE DOIT PAS');
      }
    }
    const consequences = sectionOf('decision').subsections[0];
    const consequenceArguments =
      consequences === undefined
        ? null
        : readArguments(consequences.blocks, consequences.heading, CONSEQUENCES_TITLE, report);
    if (
      consequences !== undefined &&
      consequenceArguments !== null &&
      !(
        consequenceArguments.some((argument) => argument.valence === 'good') &&
        consequenceArguments.some((argument) => argument.valence === 'bad')
      )
    ) {
      report(
        'adr/valence',
        consequences.heading,
        'au moins un « Bien » et un « Mauvais » : nommer le coût de la décision',
      );
    }
    const argumentsByOption: (readonly Argument[])[] = [];
    for (const subsection of sectionOf('prosAndCons').subsections) {
      const optionArguments = readArguments(subsection.blocks, subsection.heading, subsection.title, report);
      if (optionArguments === null) {
        continue;
      }
      argumentsByOption.push(optionArguments);
      if (options === null || decision === null || !options.includes(decision.chosen)) {
        continue;
      }
      const expected: Valence = subsection.title === decision.chosen ? 'good' : 'bad';
      if (!optionArguments.some((argument) => argument.valence === expected)) {
        report(
          'adr/valence',
          subsection.heading,
          expected === 'good'
            ? 'l’option retenue a au moins un « Bien »'
            : 'une option écartée a au moins un « Mauvais »',
        );
      }
    }
    if (criteria !== null) {
      checkCitations(tree, criteria, decision, argumentsByOption, report);
    }
    checkReevaluation(sectionOf('moreInformation'), report);
  }

  const words = countWords(tree);
  if (words > LIMITS.words) {
    report('adr/words', START, `${String(words)} mots : ${String(LIMITS.words)} au plus, hors blocs de code`);
  }

  const { links, mentions } = collectReferences(tree);
  return {
    document: {
      path: source.path,
      number: source.number,
      slug: source.slug,
      tree,
      frontMatter,
      title,
      rules,
      links,
      mentions,
    },
    diagnostics,
  };
}
