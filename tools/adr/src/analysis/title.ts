import { checkMessage } from '../spec/checks.ts';
import type { FormatSpec } from '../spec/formats/types.ts';
import { decodeSource } from './encoding.ts';
import { parseMarkdown } from './markdown.ts';
import { readTitle, titleText } from './outline.ts';
import type { FileReport } from './report.ts';

export type TitleReading = Readonly<{
  /** Messages of the title rules of the format that the title breaks. */
  problems: readonly string[];
  /** Slug of the file name, as the analysis derives it from the title. */
  slug: string;
}>;

/** How a title typed on the command line reads as the title heading of an ADR, before any file is written. */
export function readTitleArgument(title: string, spec: FormatSpec): TitleReading {
  const problems: string[] = [];
  const report: FileReport = (code, at, details) => {
    problems.push(checkMessage(code, details));
  };
  const text = decodeSource(new TextEncoder().encode(title), report);
  const [heading] = parseMarkdown(`# ${text ?? title}\n`).children;
  if (heading?.type !== 'heading' || heading.depth !== 1 || text === null || text.includes('\n')) {
    problems.push(checkMessage('adr/title-missing', {}));
    return { problems, slug: '' };
  }
  const { slug } = titleText(heading);
  readTitle(heading, { slug, expectedName: (expected) => expected }, spec, report);
  return { problems, slug };
}
