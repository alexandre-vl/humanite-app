/**
 * A fixture breaks exactly one thing on purpose; its run must report exactly the expected codes.
 * A tool proves a rule by pointing at the fixtures that make the rule fire.
 */
export type Fixture<Id extends string, Code extends string> = Readonly<{
  id: Id;
  /** What the fixture breaks, in one sentence. */
  description: string;
  /** Exact set of codes the run must report; empty for a valid fixture. */
  expected: readonly Code[];
  run: () => Promise<readonly Code[]>;
}>;

export type FixtureReport<Id extends string, Code extends string> =
  | Readonly<{ id: Id; outcome: 'passed' }>
  | Readonly<{ id: Id; outcome: 'failed'; missing: readonly Code[]; unexpected: readonly Code[] }>
  | Readonly<{ id: Id; outcome: 'crashed'; error: string }>;

export type Outcome = FixtureReport<string, string>['outcome'];

/**
 * `true` when every code appears in the `expected` list of at least one fixture, the uncovered codes otherwise:
 * `const coverage: Coverage<Code, typeof FIXTURES> = true` stops compiling as soon as a code has no fixture.
 */
export type Coverage<Code extends string, Fixtures extends readonly Fixture<string, Code>[]> = [
  Exclude<Code, Fixtures[number]['expected'][number]>,
] extends [never]
  ? true
  : Exclude<Code, Fixtures[number]['expected'][number]>;

const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function describeError(error: unknown): string {
  if (Error.isError(error)) {
    return error.stack ?? error.message;
  }
  return `non-Error value thrown (${typeof error})`;
}

export async function runFixture<Id extends string, Code extends string>(
  fixture: Fixture<Id, Code>,
): Promise<FixtureReport<Id, Code>> {
  let actual: readonly Code[];
  try {
    actual = await fixture.run();
  } catch (error) {
    return { id: fixture.id, outcome: 'crashed', error: describeError(error) };
  }
  const expected = new Set(fixture.expected);
  const observed = new Set(actual);
  const missing = [...expected.difference(observed)].toSorted(compareText);
  const unexpected = [...observed.difference(expected)].toSorted(compareText);
  return missing.length === 0 && unexpected.length === 0
    ? { id: fixture.id, outcome: 'passed' }
    : { id: fixture.id, outcome: 'failed', missing, unexpected };
}

/** Runs fixtures with at most `concurrency` in flight; reports keep the order of `fixtures`. */
export async function runFixtures<Id extends string, Code extends string>(
  fixtures: readonly Fixture<Id, Code>[],
  options: Readonly<{ concurrency: number }>,
): Promise<readonly FixtureReport<Id, Code>[]> {
  const reports = new Map<number, FixtureReport<Id, Code>>();
  let cursor = 0;
  const work = async (): Promise<void> => {
    while (cursor < fixtures.length) {
      const index = cursor;
      cursor += 1;
      const fixture = fixtures[index];
      if (fixture !== undefined) {
        reports.set(index, await runFixture(fixture));
      }
    }
  };
  const workers = Math.max(1, Math.min(options.concurrency, fixtures.length));
  await Promise.all(Array.from({ length: workers }, work));
  return [...fixtures.keys()].flatMap((index) => {
    const report = reports.get(index);
    return report === undefined ? [] : [report];
  });
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
