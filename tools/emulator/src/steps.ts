import { setTimeout as sleep } from 'node:timers/promises';

/**
 * What a step finds when it checks its postcondition: `done` when it holds, `todo` when the step can make it hold,
 * `blocked` when only someone else can, with the command they have to run.
 */
export type Evidence =
  | Readonly<{ state: 'done' | 'todo'; line: string }>
  | Readonly<{ state: 'blocked'; line: string; remedy: string | null }>;

export type Step = Readonly<{
  id: string;
  /** What holds once the step is done, in a few words. */
  summary: string;
  check: (signal: AbortSignal) => Promise<Evidence>;
  /** Makes the postcondition hold; a step without it waits for someone else to. */
  apply: ((signal: AbortSignal) => Promise<void>) | null;
  /** How long the postcondition may take to hold once applied, or to hold by itself; checked every `pollMs`. */
  settleMs: number;
}>;

export type StepOutcome = Readonly<{ id: string; summary: string; applied: boolean; line: string }>;

export type StepsReport = Readonly<{
  completed: readonly StepOutcome[];
  /** The step whose postcondition did not hold, and what it found; `null` when every step is done. */
  failure: Readonly<{ id: string; summary: string; line: string; remedy: string | null }> | null;
}>;

const POLL_MS = 1_000;

/** Checks `step` until its postcondition holds or `settleMs` has passed, and resolves the last evidence. */
async function settle(step: Step, signal: AbortSignal, pollMs: number): Promise<Evidence> {
  const deadline = Date.now() + step.settleMs;
  for (;;) {
    const evidence = await step.check(signal);
    if (evidence.state !== 'todo' || Date.now() + pollMs > deadline) {
      return evidence;
    }
    await sleep(pollMs, undefined, { signal });
  }
}

/**
 * Runs `steps` in order, each only once the previous one's postcondition holds: a step already done is skipped, a step
 * to do is applied then checked again, and the first postcondition that does not hold stops the run.
 */
export async function runSteps(
  steps: readonly Step[],
  options: Readonly<{ signal: AbortSignal; pollMs?: number; report: (outcome: StepOutcome) => void }>,
): Promise<StepsReport> {
  const pollMs = options.pollMs ?? POLL_MS;
  const completed: StepOutcome[] = [];
  for (const step of steps) {
    const before = await step.check(options.signal);
    let evidence = before;
    if (before.state === 'todo') {
      if (step.apply !== null) {
        await step.apply(options.signal);
      }
      evidence = await settle(step, options.signal, pollMs);
    }
    if (evidence.state !== 'done') {
      const remedy = evidence.state === 'blocked' ? evidence.remedy : null;
      return { completed, failure: { id: step.id, summary: step.summary, line: evidence.line, remedy } };
    }
    const outcome = { id: step.id, summary: step.summary, applied: before.state === 'todo', line: evidence.line };
    completed.push(outcome);
    options.report(outcome);
  }
  return { completed, failure: null };
}
