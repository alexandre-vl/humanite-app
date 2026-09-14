import { checkWorkspace } from '@huma/deps/check';
import { readWorkspace } from '@huma/deps/workspace';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { DEPENDENCY_POLICY } from '../workspace-manifest.ts';

const USAGE = 'Usage : pnpm deps:check';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const workspace = await readWorkspace(await findWorkspaceRoot());
  const findings = checkWorkspace(workspace, DEPENDENCY_POLICY);
  if (findings.length > 0) {
    print(renderDiagnostics(findings, 'text'));
    print(`✗ ${String(findings.length)} problème(s) de dépendances`);
    return 1;
  }
  print(`✓ dépendances cohérentes dans ${String(workspace.packages.length)} paquets`);
  return 0;
});
