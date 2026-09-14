import { isAbsolute, relative, sep } from 'node:path';
import type { Brand } from './brand.ts';

/** Repository-relative POSIX path: never empty, never absolute, no backslash, no `.` or `..` segment. */
export type RepoPath = Brand<string, 'RepoPath'>;

export const isRepoPath = (value: string): value is RepoPath =>
  value !== '' &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');

export function repoPath(value: string): RepoPath {
  if (!isRepoPath(value)) {
    throw new Error(`Chemin de dépôt invalide : ${JSON.stringify(value)}`);
  }
  return value;
}

/** Repository path of `absolute`, or `null` when it is the root itself or lies outside it. */
export function toRepoPath(root: string, absolute: string): RepoPath | null {
  const inside = relative(root, absolute);
  if (inside === '' || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) {
    return null;
  }
  const posixPath = inside.split(sep).join('/');
  return isRepoPath(posixPath) ? posixPath : null;
}
