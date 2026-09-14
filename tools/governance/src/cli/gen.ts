import { parseArgs } from 'node:util';
import { findWorkspaceRoot, print, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { ARTIFACTS, checkArtifacts, writeArtifacts } from '../artifacts.ts';

await runCommand(async () => {
  const { values } = parseArgs({
    options: { check: { type: 'boolean', default: false } },
    strict: true,
    allowPositionals: false,
  });
  const root = await findWorkspaceRoot();
  if (values.check) {
    const diagnostics = await checkArtifacts(root);
    if (diagnostics.length > 0) {
      print(renderDiagnostics(diagnostics, 'text'));
      return 1;
    }
    print(`✓ ${String(ARTIFACTS.length)} fichiers dérivés à jour`);
    return 0;
  }
  const written = await writeArtifacts(root);
  print(
    written.length === 0
      ? '✓ fichiers dérivés déjà à jour'
      : `✓ régénérés : ${written.map((file) => file.path).join(', ')}`,
  );
  return 0;
});
