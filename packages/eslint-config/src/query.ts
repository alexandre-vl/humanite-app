import * as queryModule from '@tanstack/eslint-plugin-query';
import { HERMES_FILES } from '@huma/architecture';
import type { Linter } from 'eslint';
import { pluginOf } from './plugins.ts';

const PREFIX = '@tanstack/query';

/**
 * Every rule of the TanStack Query plugin, on or off. The published preset leaves `no-rest-destructuring` at `warn`,
 * which the workspace does not tolerate, and would enrol a future rule without anyone reading it; naming each rule here
 * makes the next version of the plugin fail loudly instead.
 */
const QUERY_RULES = {
  [`${PREFIX}/exhaustive-deps`]: 'error',
  [`${PREFIX}/infinite-query-property-order`]: 'error',
  [`${PREFIX}/mutation-property-order`]: 'error',
  [`${PREFIX}/no-rest-destructuring`]: 'error',
  [`${PREFIX}/no-unstable-deps`]: 'error',
  [`${PREFIX}/no-void-query-fn`]: 'error',
  [`${PREFIX}/prefer-query-options`]: 'error',
  [`${PREFIX}/stable-query-client`]: 'error',
} as const satisfies Readonly<Record<string, Linter.RuleSeverity>>;

/** The rules of the plugin that the table above does not classify, and the ones it classifies without the plugin having them. */
function unclassifiedQueryRules(): Readonly<{ missing: readonly string[]; unknown: readonly string[] }> {
  const published = Object.keys(pluginOf(queryModule, '@tanstack/eslint-plugin-query').rules ?? {});
  const classified = Object.keys(QUERY_RULES).map((name) => name.slice(`${PREFIX}/`.length));
  return {
    missing: published.filter((name) => !classified.includes(name)),
    unknown: classified.filter((name) => !published.includes(name)),
  };
}

/**
 * TanStack Query rules of the Hermes code: a query key lists everything its function reads, an infinite query declares
 * its properties in the order its types need, a query function returns something, and a hook takes an options object.
 * They only see the app, which is the only place that runs queries.
 */
export function queryConfig(): Linter.Config {
  const { missing, unknown } = unclassifiedQueryRules();
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(`règles TanStack Query hors du tableau : ${[...missing, ...unknown].join(', ')}`);
  }
  return {
    files: [...HERMES_FILES],
    plugins: { [PREFIX]: pluginOf(queryModule, '@tanstack/eslint-plugin-query') },
    rules: { ...QUERY_RULES },
  };
}
