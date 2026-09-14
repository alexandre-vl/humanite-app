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
import type { Diagnostic } from '@huma/kit/diagnostics';
import { formatForPath } from '@huma/kit/format';
import { readTextIfExists } from '@huma/kit/fs';
import { ownRepository } from '@huma/kit/git';
import { isJsonObject, parseJson } from '@huma/kit/json';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { firstDifferentLine } from '@huma/kit/text';
import { BINDINGS, BINDINGS_PATH } from './bindings.ts';
import type { GovernanceCode } from './checks.ts';
import { governanceFinding } from './checks.ts';
import { COMMAND_NAMES, COMMANDS, commandLine, SCRIPT_AUDIENCES } from './commands.ts';
import { packageDirectories, renderWorkspaceFile, WORKSPACE_FILE_NAME } from '@huma/deps/workspace';
import { renderAgentsGuide } from './agents-guide.ts';
import { WORKSPACE_FILE } from './workspace-manifest.ts';
import { HOOK_COMMANDS, POLICY } from './policy.ts';

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

const MANIFEST = repoPath('package.json');

const manifest: Artifact = {
  path: MANIFEST,
  render: async (root) => {
    const current = parseJson(await readFile(join(root, MANIFEST), 'utf8'));
    if (!isJsonObject(current)) {
      throw new Error('package.json illisible');
    }
    const scripts = Object.fromEntries(
      COMMAND_NAMES.filter((name) => SCRIPT_AUDIENCES.includes(COMMANDS[name].audience)).map((name) => [
        name,
        commandLine(COMMANDS[name]),
      ]),
    );
    return formatForPath(root, MANIFEST, `${JSON.stringify({ ...current, scripts }, null, 2)}\n`);
  },
};

const AGENTS_GUIDE = repoPath('AGENTS.md');

const agentsGuide: Artifact = {
  path: AGENTS_GUIDE,
  render: async (root) => formatForPath(root, AGENTS_GUIDE, renderAgentsGuide(POLICY, GENERATOR)),
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

/** The solution project: the configuration files, then every package of the workspace that has a TypeScript project. */
const solution: Artifact = {
  path: SOLUTION,
  render: async (root) => {
    const projects: string[] = [];
    for (const directory of await packageDirectories(root, WORKSPACE_FILE.packages)) {
      if ((await readTextIfExists(join(root, directory, 'tsconfig.json'))) !== null) {
        projects.push(`./${directory}`);
      }
    }
    const references = ['./tsconfig.config.json', ...projects].map((path) => ({ path }));
    return formatForPath(root, SOLUTION, `${JSON.stringify({ files: [], references }, null, 2)}\n`);
  },
};

export const ARTIFACTS: readonly Artifact[] = [
  ADR_INDEX_ARTIFACT,
  claudeSettings,
  manifest,
  agentsGuide,
  claudeMemory,
  workspaceFile,
  solution,
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
