import { describeError } from '@huma/kit/errors';
import { compareText } from '@huma/kit/text';

/**
 * A fixture breaks exactly one thing on purpose, and its run must report exactly the expected codes. A tool proves
 * one of its rules by pointing at the fixtures that make the rule fire; a valid fixture expects no code.
 */

export type FixtureContext = Readonly<{
  /** Aborted when the fixture exceeds its time budget: every process and repository it starts takes this signal. */
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

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer Intersection,
) => void
  ? Intersection
  : never;

type IsUnion<Type> = [Type] extends [UnionToIntersection<Type>] ? false : true;

/**
 * Ids of the fixtures whose `expected` is not one literal tuple, `Coverage` could not count their codes: an array type
 * (`readonly Code[]`), or a union of tuples (`flag ? ['a'] : ['b']`) that expects only one of its members at run time.
 */
type NotLiteralIds<Fixtures extends readonly Fixture<string, string>[]> = Fixtures[number] extends infer Each
  ? Each extends Readonly<{ id: infer Id; expected: infer Expected extends readonly unknown[] }>
    ? number extends Expected['length']
      ? Id
      : IsUnion<Expected> extends true
        ? Id
        : never
    : never
  : never;

type Uncovered<Code extends string, Fixtures extends readonly Fixture<string, Code>[]> = Exclude<
  Code,
  Fixtures[number]['expected'][number]
>;

/**
 * `true` when every code appears in the literal `expected` tuple of at least one fixture; otherwise the uncovered
 * codes, or the ids of fixtures whose `expected` is not a literal tuple. `const coverage: Coverage<Code, typeof
 * FIXTURES> = true` stops compiling as soon as a code has no fixture.
 */
export type Coverage<Code extends string, Fixtures extends readonly Fixture<string, Code>[]> = [
  NotLiteralIds<Fixtures>,
] extends [never]
  ? [Uncovered<Code, Fixtures>] extends [never]
    ? true
    : Readonly<{ uncovered: Uncovered<Code, Fixtures> }>
  : Readonly<{ notLiteral: NotLiteralIds<Fixtures> }>;

/** The codes of `codes` that no fixture expects: the run-time counterpart of `Coverage`, for lists built at run time. */
export function uncoveredCodes<Code extends string>(
  codes: readonly Code[],
  fixtures: readonly Fixture<string, Code>[],
): readonly Code[] {
  const expected = new Set(fixtures.flatMap((fixture) => fixture.expected));
  return codes.filter((code) => !expected.has(code));
}

export type FixtureReport<Id extends string, Code extends string> = Readonly<{ id: Id; durationMs: number }> &
  (
    | Readonly<{ outcome: 'passed' }>
    | Readonly<{ outcome: 'failed'; missing: readonly Code[]; unexpected: readonly Code[] }>
    | Readonly<{ outcome: 'crashed'; error: string }>
  );

export type RunOptions = Readonly<{ timeoutMs: number }>;

/** Time budget of one fixture when the caller sets none: a fixture that hangs must not hang the check. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Time a fixture that exceeded its budget gets to stop what it started, once its signal is aborted. */
export const SETTLE_MS = 5_000;

/** Time a test runner gives a test that runs one fixture: the fixture budget, its settling time and a margin. */
export const FIXTURE_TEST_TIMEOUT_MS = DEFAULT_TIMEOUT_MS + SETTLE_MS + 5_000;

type RunEnding<Code extends string> =
  | Readonly<{ kind: 'codes'; codes: readonly Code[] }>
  | Readonly<{ kind: 'error'; error: unknown }>
  | Readonly<{ kind: 'timeout' }>;

/** Resolves when `promise` settles or after `milliseconds`, whichever comes first. */
async function settleWithin(promise: Promise<unknown>, milliseconds: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(resolve, milliseconds);
    }),
  ]);
  clearTimeout(timer);
}

export async function runFixture<Id extends string, Code extends string>(
  fixture: Fixture<Id, Code>,
  options: RunOptions = { timeoutMs: DEFAULT_TIMEOUT_MS },
): Promise<FixtureReport<Id, Code>> {
  const started = performance.now();
  const elapsed = (): number => Math.round(performance.now() - started);
  const controller = new AbortController();
  const running: Promise<RunEnding<Code>> = fixture.run({ signal: controller.signal }).then(
    (codes) => ({ kind: 'codes', codes }),
    (error: unknown) => ({ kind: 'error', error }),
  );
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<RunEnding<Code>>((resolve) => {
    timer = setTimeout(() => {
      resolve({ kind: 'timeout' });
    }, options.timeoutMs);
  });
  const ending = await Promise.race([running, timedOut]);
  clearTimeout(timer);
  switch (ending.kind) {
    case 'timeout':
      controller.abort();
      await settleWithin(running, SETTLE_MS);
      return {
        id: fixture.id,
        durationMs: elapsed(),
        outcome: 'crashed',
        error: `délai de ${String(options.timeoutMs)} ms dépassé`,
      };
    case 'error':
      return { id: fixture.id, durationMs: elapsed(), outcome: 'crashed', error: describeError(ending.error) };
    case 'codes': {
      const expected = new Set(fixture.expected);
      const observed = new Set(ending.codes);
      const missing = [...expected.difference(observed)].toSorted(compareText);
      const unexpected = [...observed.difference(expected)].toSorted(compareText);
      return missing.length === 0 && unexpected.length === 0
        ? { id: fixture.id, durationMs: elapsed(), outcome: 'passed' }
        : { id: fixture.id, durationMs: elapsed(), outcome: 'failed', missing, unexpected };
    }
  }
}

export function findDuplicateIds(fixtures: readonly Fixture<string, string>[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { id } of fixtures) {
    (seen.has(id) ? duplicates : seen).add(id);
  }
  return [...duplicates].toSorted(compareText);
}
