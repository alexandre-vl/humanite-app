import type { Root } from 'mdast';
import type { FormatSpec } from '../spec/formats/types.ts';
import type { Grammar } from './grammar.ts';
import type { SectionMap } from './outline.ts';
import type { FileReport } from './report.ts';

/** What every body check reads: the tree, its sections, the grammar of its format and where to report. */
export type BodyContext = Readonly<{
  tree: Root;
  sections: SectionMap;
  spec: FormatSpec;
  grammar: Grammar;
  report: FileReport;
}>;
