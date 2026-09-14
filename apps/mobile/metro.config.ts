import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FileStore } from '@expo/metro-config/file-store';
import type { MetroConfig } from 'expo/metro-config.js';
import { getDefaultConfig } from 'expo/metro-config.js';

/** Metro caches stay in the project, where box-gc never evicts them and no other project shares them. */
const cacheRoot = join(import.meta.dirname, 'node_modules', '.cache', 'metro');

mkdirSync(join(cacheRoot, 'file-map'), { recursive: true });

const config: MetroConfig = {
  ...getDefaultConfig(import.meta.dirname),
  cacheStores: [new FileStore({ root: join(cacheRoot, 'transform') })],
  fileMapCacheDirectory: join(cacheRoot, 'file-map'),
};

export default config;
