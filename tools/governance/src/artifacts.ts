import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { effectiveStatuses, readCollection } from '@huma/adr/collection';
import type { WrittenFile } from '@huma/adr/decide';
import { FORMAT_REGISTRY } from '@huma/adr/formats';
import { renderIndexPage } from '@huma/adr/index-page';
import { INDEX_FILE } from '@huma/adr/layout';
import { readSnapshot } from '@huma/adr/snapshot';
import { CLAUDE_SETTINGS_PATH } from '@huma/agents/policy';
import { renderClaudeSettings } from '@huma/agents/settings';
import { APP_DIRECTORY, packageImports, PLACES } from '@huma/architecture';
import { packageDirectories, renderWorkspaceFile, WORKSPACE_FILE_NAME } from '@huma/deps/workspace';
import { EMULATOR } from '@huma/emulator/config';
import { renderTrackedTable, TRACKED_TABLE } from '@huma/emulator/tracked';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { formatForPath } from '@huma/kit/format';
import { directoryNames, readTextIfExists } from '@huma/kit/fs';
import { ownRepository } from '@huma/kit/git';
import { isJsonObject, parseJson } from '@huma/kit/json';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { compareText, firstDifferentLine } from '@huma/kit/text';
import { renderEffectiveConfigs } from '@huma/lint/eslint';
import { renderAgentsGuide } from './agents-guide.ts';
import { BINDINGS, BINDINGS_PATH } from './bindings.ts';
import type { GovernanceCode } from './checks.ts';
import { governanceFinding } from './checks.ts';
import { COMMAND_NAMES, COMMANDS, commandLine, ESLINT_CONFIG_FILE, HOOK_ENTRIES, isScriptCommand } from './commands.ts';
import { HOOK_COMMANDS, POLICY } from './policy.ts';
import { renderEffectiveTsconfigs } from './tsconfig-snapshot.ts';
import { WORKSPACE_FILE } from './workspace-manifest.ts';

/** A file derived from typed sources: `pnpm gen` writes it, `pnpm gen:check` compares it without writing. */
export type Artifact = Readonly<{
  path: RepoPath;
  /** Content of the file, formatted as Prettier would leave it. */
  render: (root: string) => Promise<string>;
}>;

const GENERATOR = 'pnpm gen';

export const ADR_INDEX_ARTIFACT: Artifact = {
  path: repoPath(INDEX_FILE),
  render: async (root) => {
    const collection = readCollection(await readSnapshot(ownRepository(root), 'worktree'));
    const markdown = renderIndexPage({
      documents: collection.documents,
      statuses: effectiveStatuses(collection.documents),
      bindings: BINDINGS,
      generator: GENERATOR,
      bindingsPath: BINDINGS_PATH,
      formats: FORMAT_REGISTRY,
    });
    return formatForPath(root, repoPath(INDEX_FILE), markdown);
  },
};

const CLAUDE_SETTINGS = repoPath(CLAUDE_SETTINGS_PATH);

const claudeSettings: Artifact = {
  path: CLAUDE_SETTINGS,
  render: async (root) => formatForPath(root, CLAUDE_SETTINGS, renderClaudeSettings(POLICY, HOOK_COMMANDS)),
};

/** A `package.json` whose field `field` is derived: every other field stays as written, in its place. */
const manifestField = (path: RepoPath, field: string, value: () => unknown): Artifact => ({
  path,
  render: async (root) => {
    const current = parseJson(await readFile(join(root, path), 'utf8'));
    if (!isJsonObject(current)) {
      throw new Error(`${path} illisible`);
    }
    return formatForPath(root, path, `${JSON.stringify({ ...current, [field]: value() }, null, 2)}\n`);
  },
});

/** The scripts of the root manifest: the commands a person runs. */
const manifest = manifestField(repoPath('package.json'), 'scripts', () =>
  Object.fromEntries(
    COMMAND_NAMES.filter((name) => isScriptCommand(COMMANDS[name])).map((name) => [name, commandLine(COMMANDS[name])]),
  ),
);

/** The `#` imports of the app, one per place of the architecture. */
const appImports = manifestField(repoPath(`${APP_DIRECTORY}/package.json`), 'imports', packageImports);

const AGENTS_GUIDE = repoPath('AGENTS.md');

const agentsGuide: Artifact = {
  path: AGENTS_GUIDE,
  render: async (root) => formatForPath(root, AGENTS_GUIDE, renderAgentsGuide(GENERATOR)),
};

const CLAUDE_MEMORY = repoPath('CLAUDE.md');

/** Claude Code reads `CLAUDE.md`, not `AGENTS.md`: it imports the guide. */
const claudeMemory: Artifact = {
  path: CLAUDE_MEMORY,
  render: async (root) => formatForPath(root, CLAUDE_MEMORY, `@${AGENTS_GUIDE}\n`),
};

const WORKSPACE = repoPath(WORKSPACE_FILE_NAME);

const workspaceFile: Artifact = {
  path: WORKSPACE,
  render: async (root) => formatForPath(root, WORKSPACE, renderWorkspaceFile(WORKSPACE_FILE)),
};

const SOLUTION = repoPath('tsconfig.json');

/** A secondary TypeScript project beside a package's `tsconfig.json`: `tsconfig.node.json` for its Node files. */
const SECONDARY_PROJECT = /^tsconfig\.[a-z]+\.json$/u;

/** The TypeScript projects of `directory`, as references of the solution: `tsconfig.json` first, then the others. */
async function projectsOf(root: string, directory: string): Promise<readonly string[]> {
  const names = (await directoryNames(join(root, directory))) ?? [];
  const prefix = directory === '.' ? '.' : `./${directory}`;
  const main = directory !== '.' && names.includes('tsconfig.json') ? [prefix] : [];
  const secondary = names.filter((name) => SECONDARY_PROJECT.test(name)).toSorted(compareText);
  return [...main, ...secondary.map((name) => `${prefix}/${name}`)];
}

/**
 * The solution project, which `tsc --build` and the editors start from: every TypeScript project of the root and of
 * the packages. A file no project includes would be checked by nothing, and linted without types.
 */
const solution: Artifact = {
  path: SOLUTION,
  render: async (root) => {
    const references: string[] = [];
    for (const directory of ['.', ...(await packageDirectories(root, WORKSPACE_FILE.packages))]) {
      references.push(...(await projectsOf(root, directory)));
    }
    const text = JSON.stringify({ files: [], references: references.map((path) => ({ path })) }, null, 2);
    return formatForPath(root, SOLUTION, `${text}\n`);
  },
};

const EFFECTIVE_ESLINT_CONFIG = repoPath('packages/eslint-config/effective-config.json');

/**
 * One file of each kind the ESLint configuration tells apart, none of which needs to exist: Node code, JavaScript
 * configuration, then the routes, the public entries and the rest of the code Hermes runs.
 */
const ESLINT_SAMPLES = [
  repoPath('tools/sample/src/sample.ts'),
  repoPath(`${APP_DIRECTORY}/babel.config.js`),
  repoPath(`${APP_DIRECTORY}/${PLACES.route.directory}/sample.tsx`),
  repoPath(`${APP_DIRECTORY}/${PLACES.page.directory}/sample/index.ts`),
  repoPath(`${APP_DIRECTORY}/${PLACES.page.directory}/sample/ui/sample.tsx`),
];

/**
 * The configuration ESLint applies to each kind of file, rule by rule: a preset that changes on upgrade, or a policy
 * that loosens, shows up in the diff of this file before it reaches a commit.
 */
const effectiveEslintConfig: Artifact = {
  path: EFFECTIVE_ESLINT_CONFIG,
  render: async (root) =>
    formatForPath(
      root,
      EFFECTIVE_ESLINT_CONFIG,
      await renderEffectiveConfigs(root, ESLINT_CONFIG_FILE, ESLINT_SAMPLES),
    ),
};

const EFFECTIVE_TSCONFIG = repoPath('packages/tsconfig/effective-config.json');

/**
 * How TypeScript builds each project of the solution, option by option: an option a project loosens, or a preset that
 * changes with an upgrade of Expo or TypeScript, shows up in the diff of this file before it reaches a commit.
 */
const effectiveTsconfig: Artifact = {
  path: EFFECTIVE_TSCONFIG,
  render: async (root) => formatForPath(root, EFFECTIVE_TSCONFIG, await renderEffectiveTsconfigs(root)),
};

const KNIP_CONFIG = repoPath('knip.json');

/**
 * Files knip cannot find on its own: the entries of the commands hooks run, which no package script names, and the type
 * guard of the routes, which nothing imports on purpose. Knip reads scripts, and its plugins find configurations, tests,
 * routes and the exports of each package.
 */
const KNIP_ENTRIES: readonly string[] = [
  ...HOOK_ENTRIES,
  `${APP_DIRECTORY}/${PLACES.app.directory}/routes/typed-routes.guard.ts`,
];

/** The package directory of a file of the workspace: `tools/governance` for `tools/governance/src/cli/gen.ts`. */
const packageOf = (path: string): string => path.split('/').slice(0, 2).join('/');

/**
 * The exports of an entry file count as used only when something imports them, so a module a package exposes cannot
 * hide dead exports. The app is the exception: Expo Router reads the exports of its routes at run time, where knip
 * cannot see them, and would report every page and layout the routes re-export.
 */
const knipConfig: Artifact = {
  path: KNIP_CONFIG,
  render: async (root) => {
    const workspaces = Object.fromEntries(
      [...new Set(KNIP_ENTRIES.map(packageOf))].toSorted(compareText).map((workspace) => [
        workspace,
        {
          entry: [...new Set(KNIP_ENTRIES.filter((path) => packageOf(path) === workspace))]
            .map((path) => path.slice(workspace.length + 1))
            .toSorted(compareText),
          ...(workspace === APP_DIRECTORY ? { includeEntryExports: false } : {}),
        },
      ]),
    );
    const text = JSON.stringify(
      { $schema: 'https://unpkg.com/knip@6/schema.json', includeEntryExports: true, workspaces },
      null,
      2,
    );
    return formatForPath(root, KNIP_CONFIG, `${text}\n`);
  },
};

/** The table the root guard of the emulator reads: a tab-separated file Prettier has no parser for. */
const trackedTable: Artifact = {
  path: TRACKED_TABLE,
  render: async () => Promise.resolve(renderTrackedTable(EMULATOR)),
};

export const ARTIFACTS: readonly Artifact[] = [
  ADR_INDEX_ARTIFACT,
  claudeSettings,
  manifest,
  appImports,
  agentsGuide,
  claudeMemory,
  workspaceFile,
  solution,
  effectiveEslintConfig,
  effectiveTsconfig,
  knipConfig,
  trackedTable,
];

export async function checkArtifacts(
  root: string,
  artifacts: readonly Artifact[] = ARTIFACTS,
): Promise<readonly Diagnostic<GovernanceCode>[]> {
  const diagnostics: Diagnostic<GovernanceCode>[] = [];
  for (const artifact of artifacts) {
    const actual = await readTextIfExists(join(root, artifact.path));
    if (actual === null) {
      diagnostics.push(governanceFinding('gen/missing', artifact.path, {}));
      continue;
    }
    const expected = await artifact.render(root);
    if (actual !== expected) {
      const line = firstDifferentLine(actual, expected);
      diagnostics.push(governanceFinding('gen/stale', artifact.path, { line }, { line, column: 1 }));
    }
  }
  return diagnostics;
}

/** Writes every artifact whose content changed; returns them with their previous content. */
export async function writeArtifacts(
  root: string,
  artifacts: readonly Artifact[] = ARTIFACTS,
): Promise<readonly WrittenFile[]> {
  const written: WrittenFile[] = [];
  for (const artifact of artifacts) {
    const target = join(root, artifact.path);
    const expected = await artifact.render(root);
    const previous = await readTextIfExists(target);
    if (previous !== expected) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, expected, 'utf8');
      written.push({ path: artifact.path, previous });
    }
  }
  return written;
}
