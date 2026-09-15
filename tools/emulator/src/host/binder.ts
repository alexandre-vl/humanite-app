import { readFile, stat } from 'node:fs/promises';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { errnoCode } from '@huma/kit/errors';
import type { EmulatorCode } from '../checks.ts';
import { emulatorFinding } from '../checks.ts';
import type { EmulatorConfig } from '../config.ts';
import { CONFIG_SOURCE } from '../sources.ts';

/** The binder module and devices of the host, as a user sees them. */
export type BinderState = Readonly<{
  /** The `devices` parameter the module was loaded with; `null` when the module is not loaded. */
  devices: string | null;
  /** Each device node: `null` when absent, otherwise whether it is a character device and its permission bits. */
  nodes: ReadonlyMap<string, Readonly<{ character: boolean; mode: number }> | null>;
}>;

/** Permission bits every binder device needs: Android's services run under many users. */
const OPEN_TO_ALL = 0o666;

export async function readBinder(config: EmulatorConfig): Promise<BinderState> {
  const devices = await readFile(`/sys/module/${config.binder.module}/parameters/devices`, 'utf8').then(
    (text) => text.trim(),
    (error: unknown) => {
      if (errnoCode(error) === 'ENOENT') {
        return null;
      }
      throw error;
    },
  );
  const nodes = new Map<string, Readonly<{ character: boolean; mode: number }> | null>();
  for (const device of Object.keys(config.binder.devices)) {
    const node = `/dev/${device}`;
    nodes.set(
      node,
      await stat(node).then(
        (stats) => ({ character: stats.isCharacterDevice(), mode: stats.mode & 0o7777 }),
        (error: unknown) => {
          if (errnoCode(error) === 'ENOENT') {
            return null;
          }
          throw error;
        },
      ),
    );
  }
  return { devices, nodes };
}

/** What is wrong with the binder of the host for the emulator, as findings. */
export function binderFindings(state: BinderState, config: EmulatorConfig): readonly Diagnostic<EmulatorCode>[] {
  const expected = Object.keys(config.binder.devices).join(',');
  const module =
    state.devices === expected
      ? []
      : [
          emulatorFinding('emulator/binder-module', CONFIG_SOURCE, {
            module: config.binder.module,
            state: state.devices === null ? 'non chargé' : `chargé avec devices=${state.devices}`,
            devices: expected,
          }),
        ];
  const devices = [...state.nodes].flatMap(([device, node]) => {
    const problem =
      node === null
        ? 'absent'
        : !node.character
          ? 'pas un périphérique caractère'
          : node.mode === OPEN_TO_ALL
            ? null
            : `mode ${node.mode.toString(8)}`;
    return problem === null
      ? []
      : [emulatorFinding('emulator/binder-device', CONFIG_SOURCE, { device, state: problem })];
  });
  return [...module, ...devices];
}
