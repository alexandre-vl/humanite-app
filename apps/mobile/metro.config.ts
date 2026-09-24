import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FileStore } from '@expo/metro-config/file-store';
import { SERVICE_VARIANT, SOURCE_VARIABLE, withServiceVariants } from '@huma/architecture';
import type { MetroConfig } from 'expo/metro-config.js';
import { getDefaultConfig } from 'expo/metro-config.js';

/** Metro caches stay in the project, where box-gc never evicts them and no other project shares them. */
const cacheRoot = join(import.meta.dirname, 'node_modules', '.cache', 'metro');

mkdirSync(join(cacheRoot, 'file-map'), { recursive: true });

const defaults = getDefaultConfig(import.meta.dirname);

/**
 * Whether this build reads the journal's service. It then resolves each module's service variant before the module
 * itself, so what only the corpus needs — the simulated paper, its pictures, the API that serves them — is never
 * reached and never bundled. The app reads the same variable for its own name of the source it reads; a value neither
 * source answers to stops it at its first line.
 */
const readsService = process.env[SOURCE_VARIABLE] === SERVICE_VARIANT;

const config: MetroConfig = {
  ...defaults,
  resolver: {
    ...defaults.resolver,
    sourceExts: readsService ? withServiceVariants(defaults.resolver.sourceExts) : defaults.resolver.sourceExts,
  },
  cacheStores: [new FileStore({ root: join(cacheRoot, 'transform') })],
  fileMapCacheDirectory: join(cacheRoot, 'file-map'),
};

export default config;
