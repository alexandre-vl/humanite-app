import { findWorkspaceRoot, print, printError, readArguments, runCommand } from '@huma/kit/cli';
import { runVerify } from '../verify.ts';

const USAGE = 'Usage : pnpm verify [--staged]';

await runCommand(async () => {
  const { values } = readArguments(USAGE, { options: { staged: { type: 'boolean', default: false } } });
  const started = performance.now();
  const outcome = await runVerify(await findWorkspaceRoot(), {
    staged: values.staged,
    output: 'attached',
    env: process.env,
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  switch (outcome.kind) {
    case 'failed':
      printError(`✗ pnpm verify : échec à l’étape ${outcome.step} après ${seconds} s (${outcome.ending})`);
      return 1;
    case 'changed':
      print(`✓ pnpm verify : tous les contrôles passent en ${seconds} s`);
      // Nothing failed, so the run is green; but the tree it judged is not the one left behind, and no later check
      // may take this run for a verification of it.
      printError('⚠ une étape a écrit dans l’arbre qu’elle vérifiait : rien n’est estampillé, relancer pnpm verify');
      return 0;
    case 'passed':
      print(`✓ pnpm verify : tous les contrôles passent en ${seconds} s`);
      return 0;
  }
});
