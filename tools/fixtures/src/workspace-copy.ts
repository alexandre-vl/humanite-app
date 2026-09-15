import { access, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryDirectoryWith } from '@huma/kit/fs';
import { compareText } from '@huma/kit/text';
import type { FileTree } from './workspace.ts';
import { writeTree } from './workspace.ts';

/**
 * A temporary directory laid out like the workspace, holding only the files of a fixture: its packages resolve through
 * the workspace's own `node_modules`, linked in place, so the configuration under test sees the same modules and types.
 */
export type WorkspaceCopy = AsyncDisposable & Readonly<{ root: string }>;

const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

/** The package directories of a tree: the directories holding a `package.json`. */
const packagesOf = (files: FileTree): readonly string[] =>
  Object.keys(files)
    .filter((path) => path.endsWith('/package.json'))
    .map((path) => path.slice(0, -'/package.json'.length))
    .toSorted(compareText);

/**
 * Writes `files` into a new copy of the workspace at `workspaceRoot`, with a solution `tsconfig.json` referencing the
 * TypeScript projects of the tree. Removing the copy removes the links, never what they point at.
 */
export const workspaceCopy = async (workspaceRoot: string, files: FileTree): Promise<WorkspaceCopy> =>
  temporaryDirectoryWith('guardrail', async (path) => {
    const root = join(path, 'workspace');
    await writeTree(root, files);
    await symlink(join(workspaceRoot, 'node_modules'), join(root, 'node_modules'), 'dir');
    const projects: string[] = [];
    for (const each of packagesOf(files)) {
      const modules = join(workspaceRoot, each, 'node_modules');
      if (await exists(modules)) {
        await symlink(modules, join(root, each, 'node_modules'), 'dir');
      }
      if (Object.hasOwn(files, `${each}/tsconfig.json`)) {
        projects.push(`./${each}`);
      }
    }
    const solution = { files: [], references: projects.map((project) => ({ path: project })) };
    await writeFile(join(root, 'tsconfig.json'), `${JSON.stringify(solution, null, 2)}\n`);
    return { root };
  });
