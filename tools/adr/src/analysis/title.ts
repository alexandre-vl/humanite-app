import { checkMessage } from '../spec/checks.ts';
import type { FormatSpec } from '../spec/formats/types.ts';
import { decodeSource } from './encoding.ts';
import { parseMarkdown } from './markdown.ts';
import { readTitle } from './outline.ts';
import type { FileReport } from './report.ts';
import { slugify } from './slug.ts';

/** Messages of the title rules of `spec` that `title` breaks, before any file is written. */
export function titleProblems(title: string, spec: FormatSpec): readonly string[] {
  const problems: string[] = [];
  const report: FileReport = (code, at, details) => {
    problems.push(checkMessage(code, details));
  };
  const text = decodeSource(new TextEncoder().encode(title), report);
  const [heading] = parseMarkdown(`# ${text ?? title}\n`).children;
  if (heading?.type !== 'heading' || heading.depth !== 1 || text === null || text.includes('\n')) {
    problems.push(checkMessage('adr/title-missing', {}));
    return problems;
  }
  readTitle(heading, { slug: slugify(title), expectedName: (slug) => slug }, spec, report);
  return problems;
}
