import { EMULATOR } from '@huma/emulator/config';
import { emulatorE2e } from '@huma/emulator/e2e';
import { withCommandLock } from '@huma/emulator/lock';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:e2e';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const session = commandSession(await findWorkspaceRoot(), EMULATOR, print);
  return withCommandLock(session, 'e2e', emulatorE2e);
});
