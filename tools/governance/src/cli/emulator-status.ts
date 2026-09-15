import { EMULATOR } from '@huma/emulator/config';
import { emulatorStatus } from '@huma/emulator/status';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:status';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorStatus(await findWorkspaceRoot(), EMULATOR, print);
});
