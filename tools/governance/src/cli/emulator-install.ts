import { EMULATOR } from '@huma/emulator/config';
import { emulatorInstall } from '@huma/emulator/install';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:install';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorInstall(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
