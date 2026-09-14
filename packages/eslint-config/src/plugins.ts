import type { ESLint } from 'eslint';

const isPlugin = (value: unknown): value is ESLint.Plugin =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'rules') === 'object';

/**
 * The plugin of a module imported as a namespace. Several plugins ship as CommonJS with types that declare an ES default
 * export, which the types then promise under `default.default`; Node puts the plugin itself under `default`. The
 * namespace keeps the import static, for the tools that follow imports, and the shape is checked here.
 */
export function pluginOf(module: unknown, name: string): ESLint.Plugin {
  const plugin: unknown = typeof module === 'object' && module !== null ? Reflect.get(module, 'default') : undefined;
  if (!isPlugin(plugin)) {
    throw new Error(`${name} ne se charge pas comme un plugin ESLint`);
  }
  return plugin;
}
