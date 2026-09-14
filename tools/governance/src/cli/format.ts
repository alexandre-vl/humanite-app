import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { listFiles, ownRepository } from '@huma/kit/git';
import { checkFormatting, writeFormatting } from '@huma/lint/prettier';

const USAGE = 'Usage : pnpm format [--check]';

await runCommand(async () => {
  const { values } = readArguments(USAGE, { options: { check: { type: 'boolean', default: false } } });
  const root = await findWorkspaceRoot();
  const paths = [...(await listFiles(ownRepository(root), 'worktree'))];
  if (!values.check) {
    const written = await writeFormatting(root, paths);
    print(written.length === 0 ? '✓ fichiers déjà formatés' : `✓ formatés : ${written.join(', ')}`);
    return 0;
  }
  const report = await checkFormatting(root, paths);
  if (report.diagnostics.length > 0) {
    print(renderDiagnostics(report.diagnostics, 'text'));
    print(`✗ ${String(report.diagnostics.length)} fichier(s) à formater sur ${String(report.formatted.length)}`);
    return 1;
  }
  print(`✓ ${String(report.formatted.length)} fichiers formatés`);
  return 0;
});
