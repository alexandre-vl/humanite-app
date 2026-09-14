import { expect, test } from 'vitest';
import { ProcessError, run, runText } from './process.ts';

const cwd = process.cwd();

test('collects both outputs of a successful command', async () => {
  const result = await run('sh', ['-c', 'printf out; printf err >&2'], { cwd });
  expect(result).toMatchObject({ exitCode: 0 });
  expect(result.stdout.toString('utf8')).toBe('out');
  expect(result.stderr.toString('utf8')).toBe('err');
});

test('rejects an unexpected exit code with the tail of stderr, accepts a listed one', async () => {
  const failure = run('sh', ['-c', 'echo raison >&2; exit 3'], { cwd });
  await expect(failure).rejects.toBeInstanceOf(ProcessError);
  await expect(failure).rejects.toThrow('code de sortie 3\nraison');
  await expect(run('sh', ['-c', 'exit 3'], { cwd, successCodes: [0, 3] })).resolves.toMatchObject({ exitCode: 3 });
});

test('a child that exits without reading a large input is judged on its exit code', async () => {
  const input = 'x'.repeat(8 * 1024 * 1024);
  await expect(run('sh', ['-c', 'exit 4'], { cwd, input, successCodes: [4] })).resolves.toMatchObject({ exitCode: 4 });
});

test('passes the input to the child', async () => {
  expect(await runText('cat', [], { cwd, input: 'entrée' })).toBe('entrée');
});

test('kills a command that exceeds its timeout', async () => {
  await expect(run('sleep', ['5'], { cwd, timeoutMs: 100 })).rejects.toThrow('arrêté par le signal SIGTERM');
});

test('reports a command that cannot start', async () => {
  await expect(run('commande-introuvable-huma', [], { cwd })).rejects.toThrow('lancement impossible');
});
