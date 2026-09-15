import { EMULATOR } from '@huma/emulator/config';
import { emulatorUp } from '@huma/emulator/up';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:up';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorUp(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
