import { EMULATOR } from '@huma/emulator/config';
import { emulatorGradle } from '@huma/emulator/gradle';
import { commandSession } from '@huma/emulator/session';
import { ABIS, isAbi, isVariantName, VARIANT_NAMES } from '@huma/emulator/variant';
import { findWorkspaceRoot, print, readArguments, runCommand, UsageError } from '@huma/kit/cli';

const USAGE = `Usage : pnpm emulator:gradle [--variant ${VARIANT_NAMES.join('|')}] [--abi ${ABIS.join('|')}]`;

await runCommand(async () => {
  const { values } = readArguments(USAGE, {
    options: {
      variant: { type: 'string', default: 'debug' },
      abi: { type: 'string', default: EMULATOR.build.architectures },
    },
  });
  if (!isVariantName(values.variant) || !isAbi(values.abi)) {
    throw new UsageError(USAGE);
  }
  return emulatorGradle(commandSession(await findWorkspaceRoot(), EMULATOR, print), {
    variant: values.variant,
    abi: values.abi,
  });
});
