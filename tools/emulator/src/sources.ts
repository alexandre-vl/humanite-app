import { repoPath } from '@huma/kit/paths';

/** Files findings of the emulator point at: the one that sets what was expected. */

export const CONFIG_SOURCE = repoPath('tools/emulator/src/config.ts');

export const ANDROID_WRITES_SOURCE = repoPath('tools/emulator/src/android-writes.ts');

/** Where the files of the root guard live in the repository: root installs them from here, as they are committed. */
export const ROOT_SOURCE = repoPath('tools/emulator/root');
