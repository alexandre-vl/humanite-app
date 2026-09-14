import { parseArgs } from 'node:util';
import { runChecks } from '../check.ts';
import { formatDiagnostic } from '../diagnostics.ts';
import { findRoot, UsageError } from './root.ts';
import { bindingsSource, print, runCommand, runProof } from './shared.ts';

const USAGE = 'Usage : pnpm adr:check [--source worktree|index] [--format text|json]';

await runCommand(async () => {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: 'worktree' },
      format: { type: 'string', default: 'text' },
    },
    strict: true,
    allowPositionals: false,
  });
  const { source, format } = values;
  if ((source !== 'worktree' && source !== 'index') || (format !== 'text' && format !== 'json')) {
    throw new UsageError(USAGE);
  }
  const root = await findRoot();
  const report = await runChecks({ root, source, bindings: await bindingsSource(root), runProof });
  if (format === 'json') {
    print(JSON.stringify(report.diagnostics, null, 2));
  } else {
    report.diagnostics.map(formatDiagnostic).forEach(print);
    const files = report.collection.documents.length;
    print(
      report.diagnostics.length === 0
        ? `✓ ${String(files)} ADR conformes`
        : `✗ ${String(report.diagnostics.length)} problème(s) dans ${String(files)} ADR`,
    );
  }
  return report.diagnostics.length === 0 ? 0 : 1;
});
