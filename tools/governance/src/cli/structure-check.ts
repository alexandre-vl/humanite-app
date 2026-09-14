import { HERMES_DIRECTORIES } from '@huma/architecture';
import { readWorkspace } from '@huma/deps/workspace';
import { expoRouterApps } from '@huma/expo/apps';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { cycleFindings } from '@huma/structure/cycles';
import { steigerFindings } from '@huma/structure/steiger';

const USAGE = 'Usage : pnpm structure:check';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const root = await findWorkspaceRoot();
  let failed = false;
  for (const app of expoRouterApps(await readWorkspace(root))) {
    const findings = [...(await steigerFindings(root, app)), ...(await cycleFindings(root, app, HERMES_DIRECTORIES))];
    if (findings.length > 0) {
      failed = true;
      print(renderDiagnostics(findings, 'text'));
      print(`✗ ${app} : ${String(findings.length)} problème(s) de structure`);
      continue;
    }
    print(`✓ ${app} : structure Feature-Sliced conforme, aucun cycle d’imports`);
  }
  return failed ? 1 : 0;
});
