import { join } from 'node:path';
import { expoRouterApps } from '@huma/expo/apps';
import { loadExpoTooling } from '@huma/expo/expo';
import { syncTypedRoutes } from '@huma/expo/typed-routes';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';

const USAGE = 'Usage : pnpm expo:types';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const root = await findWorkspaceRoot();
  let failed = false;
  for (const app of await expoRouterApps(root)) {
    const report = await syncTypedRoutes(loadExpoTooling(join(root, app)), root, app);
    if (report.diagnostics.length > 0) {
      failed = true;
      print(renderDiagnostics(report.diagnostics, 'text'));
      print(`✗ ${app} : types de routes non générés`);
      continue;
    }
    const state = report.written ? 'régénérés' : 'à jour';
    print(`✓ ${app} : types de ${String(report.routes)} fichiers de routes ${state}`);
  }
  return failed ? 1 : 0;
});
