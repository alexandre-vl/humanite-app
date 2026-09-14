import { createAdr } from '@huma/adr/create';
import { FORMAT_REGISTRY } from '@huma/adr/formats';
import { formatAdrId } from '@huma/adr/identifiers';
import type { Significance } from '@huma/adr/significance';
import { isSignificance, SIGNIFICANCES } from '@huma/adr/significance';
import { findWorkspaceRoot, print, readArguments, runCommand, UsageError } from '@huma/kit/cli';
import { formatForPath } from '@huma/kit/format';
import { ownRepository } from '@huma/kit/git';
import { writeArtifacts } from '../artifacts.ts';

const USAGE = `Usage : pnpm adr:new "<titre>" --significance ${SIGNIFICANCES.join('|')}[,…]`;

await runCommand(async () => {
  const { positionals, values } = readArguments(USAGE, {
    allowPositionals: true,
    options: { significance: { type: 'string' } },
  });
  const [title, ...rest] = positionals;
  const significance = (values.significance ?? '').split(',').filter((value) => value !== '');
  if (title === undefined || rest.length > 0 || significance.length === 0 || !significance.every(isSignificance)) {
    throw new UsageError(USAGE);
  }
  const root = await findWorkspaceRoot();
  const creation = await createAdr({
    repository: ownRepository(root),
    spec: FORMAT_REGISTRY.latest,
    title: title.normalize('NFC'),
    significance: significance.filter((value): value is Significance => isSignificance(value)),
    format: async (path, text) => formatForPath(root, path, text),
  });
  await writeArtifacts(root);
  print(`✓ ${formatAdrId(creation.number)} créé : ${creation.path}`);
  print('Remplacer chaque commentaire <!-- … --> puis lancer pnpm adr:check.');
  return 0;
});
