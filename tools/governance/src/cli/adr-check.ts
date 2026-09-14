import { parseArgs } from 'node:util';
import { findWorkspaceRoot, print, runCommand, UsageError } from '@huma/kit/cli';
import { isOutputFormat, renderDiagnostics } from '@huma/kit/diagnostics';
import { checkWorkspaceAdrs } from '../workspace.ts';

const USAGE = 'Usage : pnpm adr:check [--source worktree|index] [--format text|json]';

await runCommand(async () => {
  const { values } = parseArgs({
    options: { source: { type: 'string', default: 'worktree' }, format: { type: 'string', default: 'text' } },
    strict: true,
    allowPositionals: false,
  });
  const { source, format } = values;
  if ((source !== 'worktree' && source !== 'index') || !isOutputFormat(format)) {
    throw new UsageError(USAGE);
  }
  const report = await checkWorkspaceAdrs(await findWorkspaceRoot(), source);
  if (format === 'json' || report.diagnostics.length > 0) {
    print(renderDiagnostics(report.diagnostics, format));
  }
  if (format === 'text') {
    print(
      report.diagnostics.length === 0
        ? `✓ ${String(report.documents.length)} ADR conformes`
        : `✗ ${String(report.diagnostics.length)} problème(s) dans ${String(report.documents.length)} ADR`,
    );
  }
  return report.diagnostics.length === 0 ? 0 : 1;
});
