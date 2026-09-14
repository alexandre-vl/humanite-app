import type { RepoPath } from './paths.ts';
import { compareText } from './text.ts';

export type Position = Readonly<{ line: number; column: number }>;

export const START: Position = { line: 1, column: 1 };

/** One finding of a check, located in a repository file; every tool of the workspace reports this shape. */
export type Diagnostic<Code extends string> = Readonly<{
  code: Code;
  path: RepoPath;
  /** 1-based; `START` when the finding concerns the whole file. */
  line: number;
  column: number;
  message: string;
  /** Commit a history check points at, `null` otherwise. */
  commit: string | null;
}>;

export const diagnostic = <Code extends string>(
  code: Code,
  path: RepoPath,
  position: Position,
  message: string,
  commit: string | null = null,
): Diagnostic<Code> => ({ code, path, line: position.line, column: position.column, message, commit });

export const formatDiagnostic = ({ path, line, column, code, message, commit }: Diagnostic<string>): string =>
  `${path}:${String(line)}:${String(column)}: ${code}: ${message}${commit === null ? '' : ` (commit ${commit.slice(0, 7)})`}`;

/** Path, then position, then code, then message: the same order on every run. */
export function compareDiagnostics(left: Diagnostic<string>, right: Diagnostic<string>): number {
  const order = [
    compareText(left.path, right.path),
    left.line - right.line,
    left.column - right.column,
    compareText(left.code, right.code),
    compareText(left.message, right.message),
  ];
  return order.find((difference) => difference !== 0) ?? 0;
}

export const OUTPUT_FORMATS = ['text', 'json'] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const isOutputFormat = (value: string): value is OutputFormat =>
  OUTPUT_FORMATS.some((format) => format === value);

/** Sorted diagnostics, one line each in `text`, a JSON array in `json`. */
export function renderDiagnostics(diagnostics: readonly Diagnostic<string>[], format: OutputFormat): string {
  const sorted = diagnostics.toSorted(compareDiagnostics);
  switch (format) {
    case 'text':
      return sorted.map(formatDiagnostic).join('\n');
    case 'json':
      return JSON.stringify(sorted, null, 2);
  }
}
