import type { Diagnostic, Position } from './diagnostics.ts';
import { diagnostic, START } from './diagnostics.ts';
import type { MessageDetails } from './messages.ts';
import { placeholders, renderMessage } from './messages.ts';
import type { RepoPath } from './paths.ts';
import { keysOf } from './records.ts';

/** What a check verifies, in a few words, and what a finding says: what was found, then what is expected. */
export type CheckDefinition = Readonly<{ summary: string; message: string }>;

/** A table of checks keyed by code: every entry is a `CheckDefinition`, possibly with more fields. */
export type CheckTable<Table> = { readonly [Code in keyof Table]: CheckDefinition };

export type CheckCodeOf<Table> = keyof Table & string;

/** Values of the placeholders of the message of `Code`. */
export type CheckDetailsOf<Table extends CheckTable<Table>, Code extends CheckCodeOf<Table>> = MessageDetails<
  Table[Code]['message']
>;

export type FindingFactory<Table extends CheckTable<Table>> = <Code extends CheckCodeOf<Table>>(
  code: Code,
  path: RepoPath,
  details: CheckDetailsOf<Table, Code>,
  position?: Position,
  commit?: string | null,
) => Diagnostic<Code>;

export type Checks<Table extends CheckTable<Table>> = Readonly<{
  table: Table;
  codes: readonly CheckCodeOf<Table>[];
  /** The message of `code` with its placeholders filled. */
  message: <Code extends CheckCodeOf<Table>>(code: Code, details: CheckDetailsOf<Table, Code>) => string;
  finding: FindingFactory<Table>;
}>;

/**
 * The checks of a tool, declared once as data. Every message template is validated when the table is defined, so a
 * malformed placeholder fails as soon as the tool loads, and findings are typed by the table.
 */
export function defineChecks<const Table extends CheckTable<Table>>(table: Table): Checks<Table> {
  const codes = keysOf(table);
  for (const code of codes) {
    placeholders(code, table[code].message);
  }
  const message = <Code extends CheckCodeOf<Table>>(code: Code, details: CheckDetailsOf<Table, Code>): string =>
    renderMessage(code, table[code].message, details);
  return {
    table,
    codes,
    message,
    finding: (code, path, details, position = START, commit = null) =>
      diagnostic(code, path, position, message(code, details), commit),
  };
}
