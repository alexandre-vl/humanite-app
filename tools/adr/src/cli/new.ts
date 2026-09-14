import { parseArgs } from 'node:util';
import { writeIndex } from '../check.ts';
import { createAdr } from '../creation.ts';
import { formatAdrId } from '../model.ts';
import type { Significance } from '../spec.ts';
import { SIGNIFICANCES } from '../spec.ts';
import { findRoot, UsageError } from './root.ts';
import { bindingsSource, print, printError, runCommand } from './shared.ts';

const USAGE = `Usage : pnpm adr:new "<titre>" --significance ${SIGNIFICANCES.join('|')}[,…]`;

const isSignificance = (value: string): value is Significance => SIGNIFICANCES.some((key) => key === value);

await runCommand(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: { significance: { type: 'string' } },
  });
  const [title, ...rest] = positionals;
  const significance = (values.significance ?? '').split(',').filter((value) => value !== '');
  if (title === undefined || rest.length > 0 || significance.length === 0 || !significance.every(isSignificance)) {
    throw new UsageError(USAGE);
  }
  const root = await findRoot();
  const creation = await createAdr(root, title.normalize('NFC'), significance);
  print(`✓ ${formatAdrId(creation.number)} créé : ${creation.path}`);
  try {
    await writeIndex(root, (await bindingsSource(root)).bindings);
  } catch (error) {
    printError(`Index non régénéré : ${String(error)}`);
  }
  print('Remplacer chaque commentaire <!-- … --> puis lancer pnpm adr:check.');
  return 0;
});
