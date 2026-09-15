import { join } from 'node:path';
import { emulatorBuild } from '@huma/emulator/build';
import { EMULATOR } from '@huma/emulator/config';
import { commandSession } from '@huma/emulator/session';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { nodeEntry, PINNED_NODE } from '../commands.ts';

const USAGE = 'Usage : pnpm emulator:build [--clean]';

await runCommand(async () => {
  const { values } = readArguments(USAGE, { options: { clean: { type: 'boolean', default: false } } });
  const root = await findWorkspaceRoot();
  return emulatorBuild(commandSession(root, EMULATOR, print), {
    clean: values.clean,
    gradleCommand: [join(root, PINNED_NODE), join(root, nodeEntry('emulator:gradle'))],
  });
});
