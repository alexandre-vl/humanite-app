import type { Root } from 'mdast';
import type { FormatSpec } from '../spec/formats/types.ts';
import type { Grammar } from './grammar.ts';
import type { SourceIndex } from './markdown.ts';
import type { SectionMap } from './outline.ts';
import type { FileReport } from './report.ts';

/** What every body check reads: the tree and its source, its sections, the grammar of its format and where to report. */
export type BodyContext = Readonly<{
  tree: Root;
  source: SourceIndex;
  /** Directory of the ADR in the repository, against which its relative links resolve. */
  directory: string;
  sections: SectionMap;
  spec: FormatSpec;
  grammar: Grammar;
  report: FileReport;
}>;
