import { basename, join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { compareDiagnostics } from '@huma/kit/diagnostics';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath, toRepoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import type { Linter } from 'eslint';
import { ESLint } from 'eslint';
import type { LintCode } from './checks.ts';
import { lintFinding } from './checks.ts';

/** The file the ESLint CLI would read suppressions from; the API never applies it, the repository never holds it. */
export const SUPPRESSIONS_FILE = 'eslint-suppressions.json';

/** A term code does not use, with the word it uses instead. */
export type GlossaryEntry = readonly [term: string, english: string];

export type LintRequest = Readonly<{
  root: string;
  /** The flat configuration, relative to the root: the one editors and the ESLint CLI load. */
  configFile: RepoPath;
  /** Files to consider: those no configuration matches are skipped, the others are all linted. */
  paths: readonly RepoPath[];
  /** Terms the names of the linted files and of their folders may not hold, as a whole word. */
  glossary: readonly GlossaryEntry[];
}>;

export type LintReport = Readonly<{
  /** Files ESLint checked. */
  linted: readonly RepoPath[];
  diagnostics: readonly Diagnostic<LintCode>[];
}>;

/** The severity of a rule entry of a computed configuration: `0` when off. */
function severityOf(entry: unknown): number {
  const level: unknown = Array.isArray(entry) ? entry[0] : entry;
  switch (level) {
    case 'error':
      return 2;
    case 'warn':
      return 1;
    default:
      return typeof level === 'number' ? level : 0;
  }
}

/** How many rules a computed configuration turns on: ESLint lints the files its defaults match, rules or not. */
function activeRuleCount(config: unknown): number {
  const rules: unknown = typeof config === 'object' && config !== null ? Reflect.get(config, 'rules') : undefined;
  if (typeof rules !== 'object' || rules === null) {
    return 0;
  }
  return Reflect.ownKeys(rules).filter((key) => severityOf(Reflect.get(rules, key)) !== 0).length;
}

/** A 1-based coordinate of a message: parsers report some errors, such as a file outside every project, without one. */
const coordinate = (value: number | undefined): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : 1;

const positionOf = (message: Linter.LintMessage): Readonly<{ line: number; column: number }> => ({
  line: coordinate(message.line),
  column: coordinate(message.column),
});

function messageFinding(path: RepoPath, message: Linter.LintMessage): Diagnostic<LintCode> {
  const position = positionOf(message);
  if (message.fatal === true) {
    return lintFinding('lint/parse-error', path, { text: message.message }, position);
  }
  return message.ruleId === null
    ? lintFinding('lint/inline-config', path, { text: message.message }, position)
    : lintFinding('lint/rule', path, { rule: message.ruleId, text: message.message }, position);
}

/** The words of a path, lowercase: its folder names and its file name without extensions, split on separators. */
const pathWords = (path: RepoPath): readonly string[] =>
  path
    .toLowerCase()
    .replace(/\.[^/]*$/u, '')
    .split(/[/._-]+/u)
    .filter((word) => word !== '');

/** Findings for linted files whose path holds a term of the glossary: spelling checks identifiers, never file names. */
const glossaryFindings = (paths: readonly RepoPath[], glossary: readonly GlossaryEntry[]): Diagnostic<LintCode>[] =>
  paths.flatMap((path) => {
    const words = new Set(pathWords(path));
    return glossary
      .filter(([term]) => words.has(term))
      .map(([term, english]) => lintFinding('lint/glossary-file-name', path, { term, english }));
  });

/**
 * Lints `paths` with the configuration of the repository through the ESLint API: unlike the CLI, it applies no
 * suppressions file, and every message fails, warnings and ignored inline configuration included.
 */
export async function lintPaths(request: LintRequest): Promise<LintReport> {
  const eslint = new ESLint({
    cwd: request.root,
    overrideConfigFile: join(request.root, request.configFile),
    flags: ['unstable_native_nodejs_ts_config'],
    globInputPaths: false,
    cache: false,
    applySuppressions: false,
  });
  const diagnostics: Diagnostic<LintCode>[] = [];
  const linted: RepoPath[] = [];
  for (const path of request.paths) {
    if (basename(path) === SUPPRESSIONS_FILE) {
      diagnostics.push(lintFinding('lint/suppressions-file', path, {}));
    }
    const absolute = join(request.root, path);
    if (await eslint.isPathIgnored(absolute)) {
      continue;
    }
    const config: unknown = await eslint.calculateConfigForFile(absolute);
    if (activeRuleCount(config) === 0) {
      diagnostics.push(lintFinding('lint/unconfigured', path, {}));
      continue;
    }
    linted.push(path);
  }
  const results = linted.length === 0 ? [] : await eslint.lintFiles(linted.map((path) => join(request.root, path)));
  const deprecated = new Set<string>();
  for (const result of results) {
    const path = toRepoPath(request.root, result.filePath) ?? repoPath(basename(result.filePath));
    diagnostics.push(...result.messages.map((message) => messageFinding(path, message)));
    for (const message of result.suppressedMessages) {
      const rule = message.ruleId ?? 'configuration';
      diagnostics.push(lintFinding('lint/suppressed', path, { rule, text: message.message }, positionOf(message)));
    }
    result.usedDeprecatedRules.forEach((use) => deprecated.add(use.ruleId));
  }
  for (const rule of deprecated) {
    diagnostics.push(lintFinding('lint/deprecated-rule', request.configFile, { rule }));
  }
  diagnostics.push(...glossaryFindings(linted, request.glossary));
  return { linted, diagnostics: diagnostics.toSorted(compareDiagnostics) };
}

const SEVERITY_NAMES = ['off', 'warn', 'error'] as const;

/** A rule entry of a computed configuration, its severity written as a name: `'error'`, or `['error', options…]`. */
function normalizedEntry(entry: unknown): unknown {
  const parts: readonly unknown[] = Array.isArray(entry) ? entry : [entry];
  const [level, ...options] = parts;
  const severity = typeof level === 'number' ? (SEVERITY_NAMES[level] ?? level) : level;
  return options.length === 0 ? severity : [severity, ...options];
}

/** The keys and values of an object of a computed configuration, sorted by key; `{}` for anything else. */
const sortedRecord = (value: unknown, map: (entry: unknown) => unknown = (entry) => entry): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? Object.fromEntries(
        Reflect.ownKeys(value)
          .filter((key): key is string => typeof key === 'string')
          .toSorted(compareText)
          .map((key) => [key, map(Reflect.get(value, key))]),
      )
    : {};

/**
 * The configuration ESLint applies to each of `paths`, which need not exist, as JSON: rules with their severity and
 * options, settings, parser options and plugins, every key sorted and the workspace root written `<racine>`. Presets
 * that change on upgrade then show up as a difference.
 */
export async function renderEffectiveConfigs(
  root: string,
  configFile: RepoPath,
  paths: readonly RepoPath[],
): Promise<string> {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: join(root, configFile),
    flags: ['unstable_native_nodejs_ts_config'],
  });
  const configs: Record<string, unknown> = {};
  for (const path of paths) {
    const config: unknown = await eslint.calculateConfigForFile(join(root, path));
    const field = (name: string): unknown =>
      typeof config === 'object' && config !== null ? Reflect.get(config, name) : undefined;
    const languageOptions = field('languageOptions');
    configs[path] = {
      plugins: Object.keys(sortedRecord(field('plugins'))),
      parserOptions: sortedRecord(
        typeof languageOptions === 'object' && languageOptions !== null
          ? Reflect.get(languageOptions, 'parserOptions')
          : undefined,
      ),
      settings: sortedRecord(field('settings')),
      rules: sortedRecord(field('rules'), normalizedEntry),
    };
  }
  return `${JSON.stringify(configs, null, 2).replaceAll(root, '<racine>')}\n`;
}
