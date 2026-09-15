import { join } from 'node:path';
import { shellLine, shellWord } from '@huma/kit/cli';
import { ABSENT } from '../android-writes.ts';
import type { EmulatorConfig } from '../config.ts';
import type { Residual } from '../host/sample.ts';
import { ROOT_SOURCE } from '../sources.ts';
import { ROOT_FILE_NAMES, ROOT_FILES } from './install.ts';

/**
 * The commands only root may run, which the emulator commands print and never run: the user runs each in their own
 * terminal, or with `!` in a Claude Code session. Every path is written in full, since a shell expands a pattern before
 * `sudo` runs.
 */

/** Commands for one purpose, each an argument list. */
export type RootCommands = Readonly<{ purpose: string; commands: readonly (readonly string[])[] }>;

const sudo = (argv: readonly string[]): readonly string[] => ['sudo', ...argv];

const octal = (mode: number): string => `0${mode.toString(8)}`;

/** Installs the committed files of the guard from the repository at `root`. */
export function installCommands(root: string, config: EmulatorConfig): RootCommands {
  const directory = config.guard.installDirectory;
  const modes = [...new Set(ROOT_FILE_NAMES.map((file) => ROOT_FILES[file]))];
  return {
    purpose: 'installer le garde root depuis le dépôt commité',
    commands: [
      sudo(['install', '-d', '-o', 'root', '-g', 'root', '-m', '0755', directory]),
      ...modes.map((mode) =>
        sudo([
          'install',
          '-o',
          'root',
          '-g',
          'root',
          '-m',
          octal(mode),
          ...ROOT_FILE_NAMES.filter((file) => ROOT_FILES[file] === mode).map((file) => join(root, ROOT_SOURCE, file)),
          `${directory}/`,
        ]),
      ),
    ],
  };
}

export const armCommands = (config: EmulatorConfig): RootCommands => ({
  purpose: 'armer le garde root avant pnpm emulator:up',
  commands: [sudo([join(config.guard.installDirectory, 'arm.sh')])],
});

export const disarmCommands = (config: EmulatorConfig): RootCommands => ({
  purpose: 'désarmer le garde root après pnpm emulator:down',
  commands: [sudo([join(config.guard.installDirectory, 'disarm.sh')])],
});

/** Loads the binder module with the devices of the emulator, open to every user: after each boot of the host. */
export function binderCommands(config: EmulatorConfig): RootCommands {
  const devices = Object.keys(config.binder.devices);
  return {
    purpose: 'charger binder, à refaire après chaque démarrage de l’hôte',
    commands: [
      sudo(['modprobe', config.binder.module, `devices=${devices.join(',')}`]),
      sudo(['chmod', '0666', ...devices.map((device) => `/dev/${device}`)]),
    ],
  };
}

/** The shell words that give an entry back the value of a clean host, `null` when no command can. */
function restoreWords({ write, clean }: Residual): readonly string[] | null {
  switch (write.kind) {
    case 'procattr':
    case 'sysfsattr':
    case 'mountroot': {
      const [mode = '', uid = '', gid = ''] = clean.split(' ');
      return ['chown', `${uid}:${gid}`, write.key, '&&', 'chmod', mode, write.key];
    }
    case 'sysctl':
    case 'sysfsval':
      return ['echo', shellWord(clean), '>', write.key];
    case 'superopts':
      return ['mount', '-o', 'remount,uid=0,gid=0,mode=700', write.key];
    case 'tracefsval':
      return ['echo', shellWord(clean), '>', `/sys/kernel/tracing/${write.key}`];
    case 'tracefs-instance':
      return clean === ABSENT ? ['rmdir', `/sys/kernel/tracing/instances/${write.key}`] : null;
    case 'tracefsattr':
      return null;
  }
}

/** Gives the host back the values of a clean host, in one root shell; `null` when there is nothing to give back. */
export function residueCommands(residue: readonly Residual[]): RootCommands | null {
  const scripts = residue.flatMap((residual) => {
    const words = restoreWords(residual);
    return words === null ? [] : [words.join(' ')];
  });
  return scripts.length === 0
    ? null
    : {
        purpose: 'rendre à l’hôte les valeurs qu’une session précédente d’Android a laissées',
        commands: [sudo(['sh', '-c', scripts.join(' && ')])],
      };
}

/** The commands as lines a person pastes, after the purpose. */
export const renderRootCommands = (commands: RootCommands): string =>
  [`# ${commands.purpose}`, ...commands.commands.map(shellLine)].join('\n');
