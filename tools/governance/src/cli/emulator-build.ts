import { join } from 'node:path';
import { emulatorBuild } from '@huma/emulator/build';
import { EMULATOR } from '@huma/emulator/config';
import { commandSession } from '@huma/emulator/session';
import { ABIS, isAbi, isVariantName, VARIANT_NAMES } from '@huma/emulator/variant';
import { findWorkspaceRoot, print, readArguments, runCommand, UsageError } from '@huma/kit/cli';
import { nodeEntry, PINNED_NODE } from '../commands.ts';

const USAGE = `Usage : pnpm emulator:build [--clean] [--variant ${VARIANT_NAMES.join('|')}] [--abi ${ABIS.join('|')}]`;

await runCommand(async () => {
  const { values } = readArguments(USAGE, {
    options: {
      clean: { type: 'boolean', default: false },
      variant: { type: 'string', default: 'debug' },
      abi: { type: 'string', default: EMULATOR.build.architectures },
    },
  });
  if (!isVariantName(values.variant) || !isAbi(values.abi)) {
    throw new UsageError(USAGE);
  }
  const root = await findWorkspaceRoot();
  return emulatorBuild(commandSession(root, EMULATOR, print), {
    clean: values.clean,
    gradleCommand: [
      join(root, PINNED_NODE),
      join(root, nodeEntry('emulator:gradle')),
      '--variant',
      values.variant,
      '--abi',
      values.abi,
    ],
  });
});
