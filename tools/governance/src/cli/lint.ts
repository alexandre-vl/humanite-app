import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { listFiles, ownRepository } from '@huma/kit/git';
import { lintPaths } from '@huma/lint/eslint';
import { ESLINT_CONFIG_FILE } from '../commands.ts';

const USAGE = 'Usage : pnpm lint';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const root = await findWorkspaceRoot();
  const paths = [...(await listFiles(ownRepository(root), 'worktree'))];
  const report = await lintPaths({ root, configFile: ESLINT_CONFIG_FILE, paths });
  if (report.diagnostics.length > 0) {
    print(renderDiagnostics(report.diagnostics, 'text'));
    print(`✗ ${String(report.diagnostics.length)} problème(s) ESLint dans ${String(report.linted.length)} fichiers`);
    return 1;
  }
  print(`✓ ${String(report.linted.length)} fichiers sans problème ESLint`);
  return 0;
});
