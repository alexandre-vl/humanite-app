import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { formatForPath } from '@huma/kit/format';
import { repoPath } from '@huma/kit/paths';
import { generateCorpus } from '@huma/mock-content/generate';

const USAGE = 'Usage : pnpm corpus:generate';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const root = await findWorkspaceRoot(import.meta.dirname);
  const generated = await generateCorpus();
  print(`✓ ${String(generated.pictures)} visuels écrits en ${String(generated.files)} fichiers`);
  // Written as the repository sets every file, so a fresh run leaves nothing for `pnpm format` to change.
  for (const { url, text } of generated.modules) {
    const path = repoPath(relative(root, fileURLToPath(url)));
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), await formatForPath(root, path, text));
    print(`✓ ${path}`);
  }
  print(`✓ corpus : ${String(generated.items)} items`);
  return 0;
});
