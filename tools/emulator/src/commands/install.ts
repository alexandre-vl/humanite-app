import { access } from 'node:fs/promises';
import type { ExitCode } from '@huma/kit/cli';
import { describeError } from '@huma/kit/errors';
import { adbFor, deviceShell, deviceState, runAdb } from '../android/adb.ts';
import { readApkManifest } from '../android/apk.ts';
import type { Session } from '../session.ts';
import { aapt2Executable, debugApk } from '../session.ts';

const INSTALL_TIMEOUT_MS = 300_000;

/** Installs the built dev client on the emulator, over any earlier install, and checks Android lists its package. */
export async function emulatorInstall(session: Session): Promise<ExitCode> {
  const adb = adbFor(session);
  if ((await deviceState(adb)) !== 'device') {
    session.print(`✗ ${adb.serial} n’est pas connecté : pnpm emulator:up`);
    return 1;
  }
  const apk = debugApk(session.root);
  try {
    await access(apk);
  } catch (error) {
    session.print(`✗ ${apk} : ${describeError(error)} : pnpm emulator:build`);
    return 1;
  }
  const manifest = await readApkManifest(aapt2Executable(session.config), apk, session.root);
  const output = await runAdb(adb, ['install', '-r', apk], true, INSTALL_TIMEOUT_MS);
  if (!output.includes('Success')) {
    session.print(`✗ adb install : ${output.trim()}`);
    return 1;
  }
  const path = (await runAdb(adb, deviceShell(['pm', 'path', manifest.packageName]))).trim();
  if (!path.startsWith('package:')) {
    session.print(`✗ ${manifest.packageName} absent de pm après l’installation : ${path}`);
    return 1;
  }
  session.print(`✓ ${manifest.packageName} installé sur ${adb.serial} (${path.slice('package:'.length)})`);
  return 0;
}
