import { EMULATOR } from '@huma/emulator/config';
import { emulatorGradle } from '@huma/emulator/gradle';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:gradle';

await runCommand(async () => {
  readArguments(USAGE, { options: {} });
  return emulatorGradle(commandSession(await findWorkspaceRoot(), EMULATOR, print));
});
