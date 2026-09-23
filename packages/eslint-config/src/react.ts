import * as reactHooksModule from 'eslint-plugin-react-hooks';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { APP_DIRECTORY, HERMES_FILES } from '@huma/architecture';
import { isList, isRecord } from '@huma/unknown';
import type { Linter } from 'eslint';
import reactX from 'eslint-plugin-react-x';
import { pluginOf } from './plugins.ts';

type RuleEntry = Linter.RuleEntry;

/** A rule entry raised to `error`, its options kept: the workspace tolerates no warning, so none is configured. */
function asError(entry: RuleEntry): RuleEntry {
  if (isList(entry)) {
    const [level, ...options]: readonly [Linter.RuleSeverity, ...unknown[]] = entry;
    return level === 'off' || level === 0 ? entry : ['error', ...options];
  }
  return entry === 'off' || entry === 0 ? entry : 'error';
}

const allErrors = (rules: Readonly<Partial<Record<string, RuleEntry>>>): Readonly<Record<string, RuleEntry>> =>
  Object.fromEntries(
    Object.entries(rules).flatMap(([name, entry]) => (entry === undefined ? [] : [[name, asError(entry)] as const])),
  );

/**
 * The version of React the app installs, which react-x reads to know the APIs it may suggest; `null` in a workspace
 * without the app, which holds no React code. Left to react-x, detection resolves React from the working directory,
 * where it is not installed, and silently assumes a later version.
 */
function reactVersion(root: string): string | null {
  const app = join(root, APP_DIRECTORY, 'package.json');
  if (!existsSync(app)) {
    return null;
  }
  const manifest: unknown = JSON.parse(readFileSync(createRequire(app).resolve('react/package.json'), 'utf8'));
  const version = isRecord(manifest) ? manifest['version'] : undefined;
  if (typeof version !== 'string') {
    throw new Error('version de react illisible');
  }
  return version;
}

/**
 * React rules of the Hermes code: the React team's plugin, whose rules are the React Compiler's own analysis, then
 * react-x in its strictest typed preset without the rules it duplicates from the first. Every rule is an error.
 */
export function reactConfig(root: string): Linter.Config {
  const hooks = pluginOf(reactHooksModule, 'eslint-plugin-react-hooks');
  const hooksRules: Readonly<Partial<Record<string, RuleEntry>>> =
    hooks.configs?.['recommended-latest'] !== undefined && !isList(hooks.configs['recommended-latest'])
      ? (hooks.configs['recommended-latest'].rules ?? {})
      : {};
  const strict = reactX.configs['strict-type-checked'];
  const duplicated = Object.keys(hooksRules).map((name) => name.replace('react-hooks/', 'react-x/'));
  const reactXRules = Object.fromEntries(
    Object.entries(strict.rules ?? {}).filter(([name]) => !duplicated.includes(name)),
  );
  const presetSettings: unknown = strict.settings?.['react-x'];
  const version = reactVersion(root);
  return {
    files: [...HERMES_FILES],
    plugins: { 'react-hooks': hooks, ...strict.plugins },
    settings: {
      'react-x': {
        ...(isRecord(presetSettings) ? presetSettings : {}),
        ...(version === null ? {} : { version }),
      },
    },
    rules: { ...allErrors(hooksRules), ...allErrors(reactXRules) },
  };
}
