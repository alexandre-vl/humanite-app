import { EMULATOR } from '@huma/emulator/config';
import { withCommandLock } from '@huma/emulator/lock';
import { emulatorUp } from '@huma/emulator/up';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:up';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  const session = commandSession(await findWorkspaceRoot(), EMULATOR, print);
  return withCommandLock(session, 'up', emulatorUp);
});
