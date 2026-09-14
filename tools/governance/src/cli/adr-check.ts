import { parseArgs } from 'node:util';
import { findWorkspaceRoot, print, runCommand, UsageError } from '@huma/kit/cli';
import { isOutputFormat, OUTPUT_FORMATS, renderDiagnostics } from '@huma/kit/diagnostics';
import { FILE_SOURCES, isFileSource, ownRepository } from '@huma/kit/git';
import { checkWorkspaceAdrs } from '../workspace.ts';

const USAGE = `Usage : pnpm adr:check [--source ${FILE_SOURCES.join('|')}] [--format ${OUTPUT_FORMATS.join('|')}]`;

await runCommand(async () => {
  const { values } = parseArgs({
    options: { source: { type: 'string', default: 'worktree' }, format: { type: 'string', default: 'text' } },
    strict: true,
    allowPositionals: false,
  });
  const { source, format } = values;
  if (!isFileSource(source) || !isOutputFormat(format)) {
    throw new UsageError(USAGE);
  }
  const report = await checkWorkspaceAdrs({
    repository: ownRepository(await findWorkspaceRoot()),
    source,
    environment: process.env,
  });
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
