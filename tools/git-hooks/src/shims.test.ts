import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryDirectory } from '@huma/kit/fs';
import { capture } from '@huma/kit/process';
import { expect, test } from 'vitest';
import { GIT_HOOK_NAMES, isGitHookName, renderShim, renderShims } from './shims.ts';

const COMMAND = { node: 'node_modules/.bin/node', entry: 'tools/x/hook.ts', installer: 'pnpm hooks:install' };

/** A shim without its entry refuses at once. */
const SHIM_TIMEOUT_MS = 30_000;

test('a shim execs the entry with the pinned node and the hook arguments, or refuses', () => {
  expect(renderShim('commit-msg', COMMAND)).toBe(
    [
      '#!/bin/sh',
      '# Généré par pnpm hooks:install : pnpm verify compare ce fichier octet par octet.',
      'if [ -x node_modules/.bin/node ] && [ -f tools/x/hook.ts ]; then',
      '  exec node_modules/.bin/node tools/x/hook.ts commit-msg "$@"',
      'fi',
      String.raw`printf '%s\n' "Hook git commit-msg refusé : node_modules/.bin/node ou tools/x/hook.ts introuvable dans $PWD. Lancer pnpm install dans ce worktree." >&2`,
      'exit 1',
      '',
    ].join('\n'),
  );
  expect([...renderShims(COMMAND).keys()]).toEqual(GIT_HOOK_NAMES);
  expect(isGitHookName('pre-commit')).toBe(true);
  expect(isGitHookName('post-commit')).toBe(false);
});

test('a shim without its entry exits 1 with the reason on stderr', async () => {
  await using directory = await temporaryDirectory('hooks-shim');
  const shim = join(directory.path, 'pre-commit');
  await writeFile(shim, renderShim('pre-commit', COMMAND), { mode: 0o755 });
  const result = await capture('sh', [shim], { cwd: directory.path, timeoutMs: SHIM_TIMEOUT_MS });
  expect(result.exit).toEqual({ kind: 'exited', code: 1 });
  expect(result.stderr.toString('utf8')).toBe(
    `Hook git pre-commit refusé : node_modules/.bin/node ou tools/x/hook.ts introuvable dans ${directory.path}. Lancer pnpm install dans ce worktree.\n`,
  );
});
