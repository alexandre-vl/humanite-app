import { EMULATOR } from '@huma/emulator/config';
import { emulatorMetro } from '@huma/emulator/metro';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:metro';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorMetro(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
