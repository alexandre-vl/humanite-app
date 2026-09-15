import { EMULATOR } from '@huma/emulator/config';
import { emulatorDown } from '@huma/emulator/down';
import { withCommandLock } from '@huma/emulator/lock';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:down';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const session = commandSession(await findWorkspaceRoot(), EMULATOR, print);
  return withCommandLock(session, 'down', emulatorDown);
});
