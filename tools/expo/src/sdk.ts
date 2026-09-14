import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { TestedRanges } from '@huma/deps/check';
import { isJsonObject, stringField } from '@huma/kit/json';

/** The table of the native modules an Expo SDK tested together, as `expo install` reads it. */
export const BUNDLED_NATIVE_MODULES = 'expo/bundledNativeModules.json';

/** The ranges the Expo SDK installed by the app at `appRoot` tested, which `expo install` would pick. */
export async function expoTestedRanges(appRoot: string, importer: string): Promise<TestedRanges> {
  const fromApp = createRequire(join(appRoot, 'package.json'));
  const manifest: unknown = JSON.parse(await readFile(fromApp.resolve('expo/package.json'), 'utf8'));
  const table: unknown = JSON.parse(await readFile(fromApp.resolve(BUNDLED_NATIVE_MODULES), 'utf8'));
  const version = isJsonObject(manifest) ? stringField(manifest, 'version') : null;
  if (version === null || !isJsonObject(table)) {
    throw new Error(`${BUNDLED_NATIVE_MODULES} illisible : l’intégration d’Expo est à revoir pour cette version`);
  }
  const ranges = new Map(
    Object.entries(table).map(([name, range]) => {
      if (typeof range !== 'string') {
        throw new Error(`${BUNDLED_NATIVE_MODULES} : plage de ${name} illisible`);
      }
      return [name, range] as const;
    }),
  );
  return { importer, source: `expo ${version}`, ranges };
}
