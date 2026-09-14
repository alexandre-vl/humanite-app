import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import type { Diagnostic, Position } from '@huma/kit/diagnostics';
import { diagnostic, START } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import type { Nodes, RootContent } from 'mdast';
import type { AdrDocument, Rule } from '../model/document.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { adrFileName, ruleIdAt } from '../model/identifiers.ts';
import { checkMessage } from '../spec/checks.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { FORMAT_REGISTRY } from '../spec/formats/registry.ts';
import { checkArguments } from './checks/arguments.ts';
import { checkCitations } from './checks/citations.ts';
import { checkContext } from './checks/context.ts';
import { readCriteria } from './checks/criteria.ts';
import { readDecision } from './checks/decision.ts';
import { checkKeywords } from './checks/keywords.ts';
import { checkMoreInformation } from './checks/more-information.ts';
import { readOptions } from './checks/options.ts';
import { collectReferences } from './checks/references.ts';
import { checkMarkdownSubset } from './checks/subset.ts';
import { decodeSource } from './encoding.ts';
import type { HeaderReading } from './header-reading.ts';
import { readHeader } from './header-reading.ts';
import { grammarOf } from './grammar.ts';
import { countWords, indexSource, parseMarkdown, positionOf, structuralFingerprint } from './markdown.ts';
import { mapSections, outline, readTitle } from './outline.ts';
import type { FileCode, FileReport } from './report.ts';

export type AdrSource = Readonly<{ path: RepoPath; number: AdrNumber; slug: string; bytes: Uint8Array }>;

export type AdrAnalysis = Readonly<{ document: AdrDocument; diagnostics: readonly Diagnostic<FileCode>[] }>;

const isPosition = (at: Nodes | Position): at is Position => !('type' in at);

const sha256 = (data: Uint8Array | string): string => createHash('sha256').update(data).digest('hex');

/**
 * What must not change once an ADR is decided: its body, and the fields of its header other than the status. The
 * status moves with the decision; formatting moves with the formatter.
 */
function fingerprintOf(reading: HeaderReading, rawHeader: string | null, body: readonly RootContent[]): string {
  const header =
    reading.kind === 'readable'
      ? {
          format: reading.header.format,
          significance: reading.header.significance,
          supersedes: reading.header.supersedes,
        }
      : { raw: rawHeader };
  return `tree:${sha256(structuralFingerprint({ header, body }))}`;
}

/** Every file check of one ADR, and what the collection, the bindings and the history need to know about it. */
export function analyzeAdr(source: AdrSource, registry: FormatRegistry = FORMAT_REGISTRY): AdrAnalysis {
  const diagnostics: Diagnostic<FileCode>[] = [];
  const report: FileReport = (code, at, details) => {
    diagnostics.push(diagnostic(code, source.path, isPosition(at) ? at : positionOf(at), checkMessage(code, details)));
  };
  const file = { path: source.path, number: source.number, slug: source.slug };

  const text = decodeSource(source.bytes, report);
  if (text === null) {
    return {
      document: { ...file, kind: 'unreadable', fingerprint: `bytes:${sha256(source.bytes)}`, links: [], mentions: [] },
      diagnostics,
    };
  }
  const sourceIndex = indexSource(text);
  const tree = parseMarkdown(text);
  const [head, ...rest] = tree.children;
  const body = head?.type === 'yaml' ? rest : tree.children;
  let reading: HeaderReading = { kind: 'unreadable', spec: registry.latest };
  if (head?.type === 'yaml') {
    reading = readHeader(head, registry, report);
  } else {
    report('adr/frontmatter-missing', START, {});
  }
  const { spec } = reading;
  const grammar = grammarOf(spec);
  checkMarkdownSubset(tree, text, spec, report);

  const structure = outline(body, report);
  const title =
    structure.title === null
      ? null
      : readTitle(
          structure.title,
          { slug: source.slug, expectedName: (slug) => adrFileName(source.number, slug) },
          spec,
          report,
        );
  const sections = mapSections(structure.sections, spec, structure.title ?? START, report);
  const directory = posix.dirname(source.path);

  let rules: readonly Rule[] | null = null;
  if (sections !== null) {
    const context = { tree, source: sourceIndex, directory, sections, spec, grammar, report };
    checkContext(context);
    const criteria = readCriteria(context);
    const options = readOptions(context);
    const decision = readDecision(context, options);
    const levels = checkKeywords(context, decision.ruleParagraphs);
    if (decision.rules !== null) {
      const read = decision.rules.flatMap(({ number, paragraph }): Rule[] => {
        const level = levels.get(paragraph);
        return level === undefined ? [] : [{ id: ruleIdAt(number - 1), level }];
      });
      rules = read.length === decision.rules.length ? read : null;
      if (rules !== null && !rules.some((rule) => grammar.bindingLevels.includes(rule.level))) {
        report('adr/decision-no-binding-rule', decision.chosenParagraph ?? sections.decision.heading, {
          binding: grammar.bindingLevels.map((level) => spec.keywords[level].label),
        });
      }
    }
    const argumentsReading = checkArguments(context, options, decision.chosen);
    if (criteria !== null) {
      checkCitations(context, criteria, decision.chosenParagraph, argumentsReading);
    }
    checkMoreInformation(context);
  }

  const words = countWords(tree);
  if (words > spec.limits.words) {
    report('adr/words-limit', START, { count: words, max: spec.limits.words });
  }
  const { links, mentions } = collectReferences(tree, { directory, spec, grammar, source: sourceIndex, report });
  const fingerprint = fingerprintOf(reading, head?.type === 'yaml' ? head.value : null, body);
  const document: AdrDocument =
    reading.kind === 'readable' && title !== null
      ? { ...file, kind: 'readable', spec, header: reading.header, title, rules, fingerprint, links, mentions }
      : { ...file, kind: 'unreadable', fingerprint, links, mentions };
  return { document, diagnostics };
}
