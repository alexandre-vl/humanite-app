import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { findWorkspaceRoot, UsageError, WORKSPACE_MARKER } from './cli.ts';

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
