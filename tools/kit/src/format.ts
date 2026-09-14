import { join } from 'node:path';
import type { Options } from 'prettier';
import { format, resolveConfig } from 'prettier';
import type { RepoPath } from './paths.ts';

/** The options Prettier applies to the file at `absolute`, `.editorconfig` included, as the CLI resolves them. */
export const prettierOptionsFor = async (absolute: string): Promise<Options> => ({
  ...(await resolveConfig(absolute, { editorconfig: true })),
  filepath: absolute,
});

/**
 * `text` formatted by Prettier with the configuration that applies at `root/path`: every generated file is written
 * exactly as `pnpm format` would leave it.
 */
export async function formatForPath(root: string, path: RepoPath, text: string): Promise<string> {
  return format(text, await prettierOptionsFor(join(root, path)));
}
