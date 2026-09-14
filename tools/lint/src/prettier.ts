import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { describeError } from '@huma/kit/errors';
import { prettierOptionsFor } from '@huma/kit/format';
import type { RepoPath } from '@huma/kit/paths';
import { check, format, getFileInfo } from 'prettier';
import type { LintCode } from './checks.ts';
import { lintFinding } from './checks.ts';

/** Tracked files Prettier leaves as they are, each with its reason. */
export const PRETTIER_IGNORE_FILE = '.prettierignore';

export type FormatReport = Readonly<{
  /** Files Prettier formats among those given: the others have no parser or are ignored. */
  formatted: readonly RepoPath[];
  diagnostics: readonly Diagnostic<LintCode>[];
}>;

type Formattable = Readonly<{ path: RepoPath; absolute: string }>;

/** The files of `paths` Prettier formats: neither ignored by `.prettierignore` nor without a parser. */
async function formattable(root: string, paths: readonly RepoPath[]): Promise<readonly Formattable[]> {
  const files: Formattable[] = [];
  for (const path of paths) {
    const absolute = join(root, path);
    const info = await getFileInfo(absolute, { ignorePath: join(root, PRETTIER_IGNORE_FILE) });
    if (!info.ignored && info.inferredParser !== null) {
      files.push({ path, absolute });
    }
  }
  return files;
}

/** Checks, without writing, that each file of `paths` Prettier formats is formatted. */
export async function checkFormatting(root: string, paths: readonly RepoPath[]): Promise<FormatReport> {
  const files = await formattable(root, paths);
  const diagnostics: Diagnostic<LintCode>[] = [];
  for (const file of files) {
    try {
      if (!(await check(await readFile(file.absolute, 'utf8'), await prettierOptionsFor(file.absolute)))) {
        diagnostics.push(lintFinding('lint/unformatted', file.path, {}));
      }
    } catch (error) {
      diagnostics.push(lintFinding('lint/format-error', file.path, { text: describeError(error) }));
    }
  }
  return { formatted: files.map((file) => file.path), diagnostics };
}

/** Formats each file of `paths` Prettier formats; returns those it rewrote. */
export async function writeFormatting(root: string, paths: readonly RepoPath[]): Promise<readonly RepoPath[]> {
  const written: RepoPath[] = [];
  for (const file of await formattable(root, paths)) {
    const text = await readFile(file.absolute, 'utf8');
    const formatted = await format(text, await prettierOptionsFor(file.absolute));
    if (formatted !== text) {
      await writeFile(file.absolute, formatted, 'utf8');
      written.push(file.path);
    }
  }
  return written;
}
