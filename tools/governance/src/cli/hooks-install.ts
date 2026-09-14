import { installShims } from '@huma/git-hooks/installation';
import { findWorkspaceRoot, print, printError, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { installationContext, SHIMS } from '../git-hooks.ts';

const USAGE = 'Usage : pnpm hooks:install';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const outcome = await installShims(installationContext(await findWorkspaceRoot()), SHIMS);
  if (outcome.kind === 'refused') {
    printError(renderDiagnostics(outcome.findings, 'text'));
    printError('✗ hooks git non installés : retirer d’abord ce qui les détourne');
    return 1;
  }
  print(`✓ hooks git installés : ${outcome.hooks.join(', ')}`);
  return 0;
});
