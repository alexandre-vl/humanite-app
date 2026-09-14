import { mapConcurrently } from '@huma/kit/pool';
import { compareText } from '@huma/kit/text';

/**
 * A fixture breaks exactly one thing on purpose, and its run must report exactly the expected codes. A tool proves
 * one of its rules by pointing at the fixtures that make the rule fire; a valid fixture expects no code.
 */

export type FixtureContext = Readonly<{
  /** Aborted when the fixture exceeds its time budget: long runs pass it to the processes they start. */
  signal: AbortSignal;
}>;

export type Fixture<Id extends string, Code extends string> = Readonly<{
  id: Id;
  /** What the fixture breaks, in one sentence. */
  description: string;
  /** Exact set of codes the run must report. */
  expected: readonly Code[];
  run: (context: FixtureContext) => Promise<readonly Code[]>;
}>;

export type FixtureDefiner<Code extends string> = <const Id extends string, const Expected extends readonly Code[]>(
  id: Id,
  description: string,
  expected: Expected,
  run: (context: FixtureContext) => Promise<readonly Code[]>,
) => Fixture<Id, Code> & Readonly<{ expected: Expected }>;

/**
 * Builds fixtures whose `id` and `expected` keep their literal types, which `Coverage` needs:
 * `const define = fixtureFactory<CheckCode>()`, then `define('id', 'description', ['code'], run)`.
 */
export function fixtureFactory<Code extends string>(): FixtureDefiner<Code> {
  return (id, description, expected, run) => ({ id, description, expected, run });
}

/** Ids of the fixtures whose `expected` was widened to an array type: `Coverage` cannot count their codes. */
type WidenedIds<Fixtures extends readonly Fixture<string, string>[]> = Fixtures[number] extends infer Each
  ? Each extends Readonly<{ id: infer Id; expected: infer Expected extends readonly unknown[] }>
    ? number extends Expected['length']
      ? Id
      : never
    : never
  : never;

/**
 * `true` when every code appears in the literal `expected` tuple of at least one fixture; otherwise the uncovered
 * codes, or the ids of fixtures whose `expected` is not a literal tuple. `const coverage: Coverage<Code, typeof
 * FIXTURES> = true` stops compiling as soon as a code has no fixture.
 */
export type Coverage<Code extends string, Fixtures extends readonly Fixture<string, Code>[]> = [
  WidenedIds<Fixtures>,
] extends [never]
  ? [Exclude<Code, Fixtures[number]['expected'][number]>] extends [never]
    ? true
    : Readonly<{ uncovered: Exclude<Code, Fixtures[number]['expected'][number]> }>
  : Readonly<{ notLiteral: WidenedIds<Fixtures> }>;

export type FixtureReport<Id extends string, Code extends string> = Readonly<{ id: Id; durationMs: number }> &
  (
    | Readonly<{ outcome: 'passed' }>
    | Readonly<{ outcome: 'failed'; missing: readonly Code[]; unexpected: readonly Code[] }>
    | Readonly<{ outcome: 'crashed'; error: string }>
  );

export type Outcome = FixtureReport<string, string>['outcome'];

export type RunOptions = Readonly<{ timeoutMs: number }>;

/** Time budget of one fixture when the caller sets none: a fixture that hangs must not hang the check. */
export const DEFAULT_TIMEOUT_MS = 120_000;

function describeError(error: unknown): string {
  if (Error.isError(error)) {
    return error.stack ?? error.message;
  }
  return `valeur non Error levée (${typeof error})`;
}

export async function runFixture<Id extends string, Code extends string>(
  fixture: Fixture<Id, Code>,
  options: RunOptions = { timeoutMs: DEFAULT_TIMEOUT_MS },
): Promise<FixtureReport<Id, Code>> {
  const started = performance.now();
  const elapsed = (): number => Math.round(performance.now() - started);
  const signal = AbortSignal.timeout(options.timeoutMs);
  let actual: readonly Code[];
  try {
    actual = await Promise.race([
      fixture.run({ signal }),
      new Promise<never>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new Error(`délai de ${String(options.timeoutMs)} ms dépassé`));
        });
      }),
    ]);
  } catch (error) {
    return { id: fixture.id, durationMs: elapsed(), outcome: 'crashed', error: describeError(error) };
  }
  const expected = new Set(fixture.expected);
  const observed = new Set(actual);
  const missing = [...expected.difference(observed)].toSorted(compareText);
  const unexpected = [...observed.difference(expected)].toSorted(compareText);
  return missing.length === 0 && unexpected.length === 0
    ? { id: fixture.id, durationMs: elapsed(), outcome: 'passed' }
    : { id: fixture.id, durationMs: elapsed(), outcome: 'failed', missing, unexpected };
}

/** Runs fixtures with at most `concurrency` in flight; reports keep the order of `fixtures`. */
export async function runFixtures<Id extends string, Code extends string>(
  fixtures: readonly Fixture<Id, Code>[],
  options: Readonly<{ concurrency: number }> & Partial<RunOptions>,
): Promise<readonly FixtureReport<Id, Code>[]> {
  const runOptions: RunOptions = { timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS };
  return mapConcurrently(fixtures, options.concurrency, async (fixture) => runFixture(fixture, runOptions));
}

export function findDuplicateIds(fixtures: readonly Fixture<string, string>[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { id } of fixtures) {
    (seen.has(id) ? duplicates : seen).add(id);
  }
  return [...duplicates].toSorted(compareText);
}

const listCodes = (codes: readonly string[]): string => (codes.length === 0 ? '∅' : codes.join(', '));

export function formatReports(reports: readonly FixtureReport<string, string>[]): string {
  const lines = reports.map((report) => {
    switch (report.outcome) {
      case 'passed':
        return `✓ ${report.id}`;
      case 'failed':
        return `✗ ${report.id} — manquants : ${listCodes(report.missing)} ; en trop : ${listCodes(report.unexpected)}`;
      case 'crashed':
        return `✗ ${report.id} — plantage : ${report.error.split('\n', 1)[0] ?? ''}`;
    }
  });
  const passed = reports.filter((report) => report.outcome === 'passed').length;
  return [...lines, `${String(passed)}/${String(reports.length)} fixtures conformes`].join('\n');
}
