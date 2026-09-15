import { emulatorBuild } from '@huma/emulator/build';
import { EMULATOR } from '@huma/emulator/config';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = 'Usage : pnpm emulator:build [--clean]';

await runCommand(async () => {
  const { values } = readArguments(USAGE, { options: { clean: { type: 'boolean', default: false } } });
  return emulatorBuild(commandSession(await findWorkspaceRoot(), EMULATOR, print), { clean: values.clean });
});
