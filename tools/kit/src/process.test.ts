import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { temporaryDirectory } from './fs.ts';
import { capture, ProcessError, run, runAttached, runText } from './process.ts';

const cwd = process.cwd();

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

describe('capture', () => {
  test('collects both outputs and the exit code', async () => {
    const result = await capture('sh', ['-c', 'printf out; printf err >&2; exit 3'], { cwd });
    expect(result.exit).toEqual({ kind: 'exited', code: 3 });
    expect(result.stdout.toString('utf8')).toBe('out');
    expect(result.stderr.toString('utf8')).toBe('err');
  });

  test('a child that exits without reading a large input is judged on its exit code', async () => {
    const input = 'x'.repeat(8 * 1024 * 1024);
    expect((await capture('sh', ['-c', 'exit 4'], { cwd, input })).exit).toEqual({ kind: 'exited', code: 4 });
  });

  test('reports a child killed by a signal as killed, never as exited', async () => {
    expect((await capture('sh', ['-c', 'kill -9 $$'], { cwd })).exit).toEqual({ kind: 'killed', signal: 'SIGKILL' });
  });

  test('a time budget stops the child and the processes it started', async () => {
    await using directory = await temporaryDirectory('kit-process');
    const pidFile = join(directory.path, 'grandchild');
    const started = performance.now();
    const result = await capture('sh', ['-c', `sleep 30 & echo $! > ${pidFile}; wait`], { cwd, timeoutMs: 200 });
    expect(result.exit).toEqual({ kind: 'timed-out', afterMs: 200 });
    expect(performance.now() - started).toBeLessThan(5_000);
    const grandchild = Number((await readFile(pidFile, 'utf8')).trim());
    expect(isAlive(grandchild)).toBe(false);
  });

  test('a child that ignores SIGTERM is killed after the grace delay, and still reported as timed out', async () => {
    const result = await capture('sh', ['-c', 'trap "" TERM; while :; do sleep 1; done'], {
      cwd,
      timeoutMs: 100,
      killGraceMs: 100,
    });
    expect(result.exit).toEqual({ kind: 'timed-out', afterMs: 100 });
  });

  test('an abort stops the child; an already aborted signal starts nothing', async () => {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 100);
    expect((await capture('sleep', ['30'], { cwd, signal: controller.signal })).exit).toEqual({ kind: 'aborted' });
    expect((await capture('sleep', ['30'], { cwd, signal: AbortSignal.abort() })).exit).toEqual({ kind: 'aborted' });
  });

  test('outputs held open by a leftover process do not hold the result', async () => {
    const started = performance.now();
    const result = await capture('sh', ['-c', 'sleep 5 & echo parti'], { cwd });
    expect(result.exit).toEqual({ kind: 'exited', code: 0 });
    expect(result.stdout.toString('utf8')).toBe('parti\n');
    expect(performance.now() - started).toBeLessThan(4_000);
  });

  test('reports a command that cannot start', async () => {
    const result = await capture('commande-introuvable-huma', [], { cwd });
    expect(result.exit.kind).toBe('unstartable');
  });
});

describe('run', () => {
  test('resolves on a success code and rejects any other ending with the tail of stderr', async () => {
    await expect(run('sh', ['-c', 'exit 3'], { cwd, successCodes: [0, 3] })).resolves.toMatchObject({ exitCode: 3 });
    const failure = run('sh', ['-c', 'echo raison >&2; exit 3'], { cwd });
    await expect(failure).rejects.toBeInstanceOf(ProcessError);
    await expect(failure).rejects.toThrow('code de sortie 3\nraison');
    await expect(run('sh', ['-c', 'kill -9 $$'], { cwd, successCodes: [0, 137] })).rejects.toThrow(
      'tué par le signal SIGKILL',
    );
    await expect(run('commande-introuvable-huma', [], { cwd })).rejects.toThrow('lancement impossible');
  });

  test('runText passes the input and refuses output that is not UTF-8', async () => {
    expect(await runText('cat', [], { cwd, input: 'entrée' })).toBe('entrée');
    await expect(runText('printf', [String.raw`\377`], { cwd })).rejects.toThrow('pas de l’UTF-8 valide');
  });
});

test('runAttached reports how the child ended', async () => {
  expect(await runAttached('sh', ['-c', 'exit 5'], { cwd })).toEqual({ kind: 'exited', code: 5 });
  expect(await runAttached('sh', ['-c', 'kill -TERM $$'], { cwd })).toEqual({ kind: 'killed', signal: 'SIGTERM' });
  expect((await runAttached('commande-introuvable-huma', [], { cwd })).kind).toBe('unstartable');
});
