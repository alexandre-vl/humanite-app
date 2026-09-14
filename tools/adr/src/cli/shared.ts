import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runFixture } from '@huma/fixtures';
import { BINDINGS } from '../bindings.ts';
import { PROOFS } from '../fixtures/proofs.ts';
import { repoPath } from '../model.ts';
import type { BindingsSource } from '../repository.ts';
import { UsageError } from './root.ts';

export const BINDINGS_FILE = repoPath('tools/adr/src/bindings.ts');

export const print = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

export const printError = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

/** Runs a command body and turns its result into the exit code: 0 success, 1 findings or refusal, 2 misuse or crash. */
export async function runCommand(body: () => Promise<0 | 1>): Promise<void> {
  try {
    process.exitCode = await body();
  } catch (error) {
    printError(
      Error.isError(error)
        ? error instanceof UsageError
          ? error.message
          : (error.stack ?? error.message)
        : String(error),
    );
    process.exitCode = 2;
  }
}

export async function bindingsSource(root: string): Promise<BindingsSource> {
  return {
    bindings: BINDINGS,
    path: BINDINGS_FILE,
    text: await readFile(join(root, BINDINGS_FILE), 'utf8'),
    knownProofs: new Set(PROOFS.map((fixture) => fixture.id)),
  };
}

/** Runs the fixture behind a proof id; an unknown id never passes. */
export async function runProof(proof: string): Promise<boolean> {
  const fixture = PROOFS.find((candidate) => candidate.id === proof);
  return fixture !== undefined && (await runFixture(fixture)).outcome === 'passed';
}
