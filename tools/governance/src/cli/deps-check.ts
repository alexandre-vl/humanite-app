import { join } from 'node:path';
import { checkWorkspace } from '@huma/deps/check';
import { readWorkspace } from '@huma/deps/workspace';
import { expoRouterApps } from '@huma/expo/apps';
import { expoTestedRanges } from '@huma/expo/sdk';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { DEPENDENCY_POLICY } from '../workspace-manifest.ts';

const USAGE = 'Usage : pnpm deps:check';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const root = await findWorkspaceRoot();
  const workspace = await readWorkspace(root);
  const tested = await Promise.all(
    expoRouterApps(workspace).map(async (app) => expoTestedRanges(join(root, app), app)),
  );
  const findings = checkWorkspace(workspace, DEPENDENCY_POLICY, tested);
  if (findings.length > 0) {
    print(renderDiagnostics(findings, 'text'));
    print(`✗ ${String(findings.length)} problème(s) de dépendances`);
    return 1;
  }
  const sources = tested.map((ranges) => `${ranges.importer} tenu aux plages de ${ranges.source}`);
  print(
    `✓ dépendances cohérentes dans ${String(workspace.packages.length)} paquets${sources.length === 0 ? '' : ` ; ${sources.join(', ')}`}`,
  );
  return 0;
});
