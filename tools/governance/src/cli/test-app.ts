import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import type { ExitCode } from '@huma/kit/cli';
import { describeExit, runAttached } from '@huma/kit/process';

const USAGE = 'Usage : pnpm test:app';

/** Jest and its React Native transform are slow on a loaded shared host; a hung run fails instead of holding a commit. */
const BUDGET_MS = 540_000;

await runCommand(async (): Promise<ExitCode> => {
  readArguments(USAGE, { options: {} });
  const app = join(await findWorkspaceRoot(), APP_DIRECTORY);
  const exit = await runAttached(join(app, 'node_modules', '.bin', 'jest'), ['--ci'], {
    cwd: app,
    timeoutMs: BUDGET_MS,
  });
  const passed = exit.kind === 'exited' && exit.code === 0;
  print(`${passed ? '✓' : '✗'} tests jest-expo et RNTL : ${describeExit(exit)}`);
  return passed ? 0 : 1;
});
