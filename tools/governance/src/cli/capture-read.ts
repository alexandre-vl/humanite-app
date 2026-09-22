import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chooseAnswers, moduleOf } from '@huma/capture/answers';
import { readHar } from '@huma/capture/har';
import { judgeSecrets } from '@huma/capture/secrets';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { formatForPath } from '@huma/kit/format';
import { repoPath } from '@huma/kit/paths';

const USAGE = 'Usage : pnpm capture:read <fichier.har>';

/** Where the answers a capture keeps are written down, and the only file this command writes. */
const RECORDED = repoPath('packages/contracts/src/recorded.ts');

await runCommand(async () => {
  const { positionals } = readArguments(USAGE, { options: {}, allowPositionals: true });
  const [file] = positionals;
  if (file === undefined) {
    print(USAGE);
    return 1;
  }

  const root = await findWorkspaceRoot(import.meta.dirname);
  const exchanges = readHar(await readFile(file, 'utf8'));
  const chosen = chooseAnswers(exchanges);
  print(`· ${String(exchanges.length)} échanges lus`);
  for (const [name, body] of Object.entries(chosen.answers)) {
    const posts = body['posts'];
    const count = Array.isArray(posts) ? ` — ${String(posts.length)} items` : '';
    print(`  ✓ ${name}${count}`);
  }
  for (const format of Object.keys(chosen.articles).toSorted((left, right) => left.localeCompare(right))) {
    print(`  ✓ un article « ${format} »`);
  }
  for (const name of chosen.missing) {
    print(`  · ${name} : cette capture n’en tient aucun`);
  }

  const written = await formatForPath(root, RECORDED, moduleOf(chosen));

  // Judged before it is written, never after: a secret that reached the disk has reached a place git can pick it up.
  const findings = judgeSecrets(written);
  if (findings.length > 0) {
    for (const { code, says } of findings) {
      print(`✗ ${code} : ${says}`);
    }
    print('rien n’a été écrit : une capture ne fait pas entrer de secret dans le dépôt');
    return 1;
  }

  await writeFile(join(root, RECORDED), written);
  print(`✓ ${RECORDED} écrit, sans secret`);
  return 0;
});
