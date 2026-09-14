import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import type { RepoPath } from './paths.ts';

/**
 * `text` formatted by Prettier with the configuration that applies at `root/path`, `.editorconfig` included as the CLI
 * reads it: every generated file is written exactly as `prettier --write` would leave it.
 */
export async function formatForPath(root: string, path: RepoPath, text: string): Promise<string> {
  const filepath = join(root, path);
  const config = await resolveConfig(filepath, { editorconfig: true });
  return format(text, { ...config, filepath });
}
