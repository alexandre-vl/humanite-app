import { EMULATOR } from '@huma/emulator/config';
import { emulatorE2e } from '@huma/emulator/e2e';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:e2e';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorE2e(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
