import { parseArgs } from 'node:util';
import { findWorkspaceRoot, print, printError, runCommand } from '@huma/kit/cli';
import { runVerify } from '../verify.ts';

await runCommand(async () => {
  const { values } = parseArgs({
    options: { staged: { type: 'boolean', default: false } },
    strict: true,
    allowPositionals: false,
  });
  const started = performance.now();
  const outcome = await runVerify(await findWorkspaceRoot(), {
    staged: values.staged,
    output: 'attached',
    env: process.env,
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  if (outcome.kind === 'failed') {
    printError(`✗ pnpm verify : échec à l’étape ${outcome.step} après ${seconds} s`);
    return 1;
  }
  print(`✓ pnpm verify : tous les contrôles passent en ${seconds} s`);
  return 0;
});
