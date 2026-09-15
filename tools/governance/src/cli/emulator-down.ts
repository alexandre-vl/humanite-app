import { EMULATOR } from '@huma/emulator/config';
import { emulatorDown } from '@huma/emulator/down';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:down';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorDown(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
