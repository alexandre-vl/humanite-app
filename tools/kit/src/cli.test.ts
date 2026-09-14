import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { findWorkspaceRoot, readArguments, UsageError, WORKSPACE_MARKER } from './cli.ts';

test('readArguments reads options strictly and turns a wrong invocation into a usage error', () => {
  const config = { args: ['--check'], options: { check: { type: 'boolean', default: false } } } as const;
  expect(readArguments('Usage : x [--check]', config).values.check).toBe(true);
  expect(() => readArguments('Usage : x [--check]', { ...config, args: ['--bogus'] })).toThrow(UsageError);
  expect(() => readArguments('Usage : x [--check]', { ...config, args: ['extra'] })).toThrow(/Usage : x \[--check\]/u);
});

test('findWorkspaceRoot walks up to the marker, and fails as a usage error without one', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kit-root-'));
  try {
    await mkdir(join(root, 'a', 'b'), { recursive: true });
    await writeFile(join(root, WORKSPACE_MARKER), 'packages: []\n');
    expect(await findWorkspaceRoot(join(root, 'a', 'b'))).toBe(root);
    await rm(join(root, WORKSPACE_MARKER));
    await expect(findWorkspaceRoot(join(root, 'a', 'b'))).rejects.toBeInstanceOf(UsageError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
