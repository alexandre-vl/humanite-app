import { createRequire } from 'node:module';
import type { ESLint } from 'eslint';

const requireFromConfig = createRequire(import.meta.url);

const isPlugin = (value: unknown): value is ESLint.Plugin =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'rules') === 'object';

/**
 * A plugin published as CommonJS whose types declare an ES default export: Node hands the plugin itself to a default
 * import, while the types promise it under `default`. Loading it with `require` and checking its shape keeps both right.
 */
export function commonJsPlugin(name: string): ESLint.Plugin {
  const plugin: unknown = requireFromConfig(name);
  if (!isPlugin(plugin)) {
    throw new Error(`${name} ne se charge pas comme un plugin ESLint`);
  }
  return plugin;
}
