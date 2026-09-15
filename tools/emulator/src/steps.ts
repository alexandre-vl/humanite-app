import { setTimeout as sleep } from 'node:timers/promises';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { formatDiagnostic } from '@huma/kit/diagnostics';
import { describeError } from '@huma/kit/errors';
import type { RootCommands } from './guard/root-commands.ts';
import { renderRootCommands } from './guard/root-commands.ts';
import type { Session } from './session.ts';

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

/**
 * Runs `work` and turns anything it throws into evidence that the step is blocked: a docker that answers nothing, a
 * `flock` that gives up, a file that vanished. The run then reports the step that stopped it, never a stack trace.
 */
async function attempt(work: () => Promise<Evidence>): Promise<Evidence> {
  try {
    return await work();
  } catch (error) {
    return blocked(describeError(error));
  }
}

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
    const before = await attempt(async () => step.check(options.signal));
    let evidence = before;
    if (before.state === 'todo') {
      evidence = await attempt(async () => {
        await step.apply?.(options.signal);
        return settle(step, options.signal, pollMs);
      });
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

export const done = (line: string): Evidence => ({ state: 'done', line });

export const todo = (line: string): Evidence => ({ state: 'todo', line });

/** A postcondition only someone else can make hold: findings, or a line, and the root commands that would. */
export const blocked = (
  cause: readonly Diagnostic<string>[] | string,
  remedy: RootCommands | null = null,
): Evidence => ({
  state: 'blocked',
  line: typeof cause === 'string' ? cause : cause.map(formatDiagnostic).join('\n'),
  remedy: remedy === null ? null : renderRootCommands(remedy),
});

/** A step that only checks what someone else sets up. */
export const precondition = (id: string, summary: string, check: Step['check']): Step => ({
  id,
  summary,
  check,
  apply: null,
  settleMs: 0,
});

/** Runs `steps`, printing each postcondition that holds, then the one that does not with its remedy. */
export async function runReported(session: Session, steps: readonly Step[]): Promise<StepsReport> {
  const report = await runSteps(steps, {
    signal: session.signal,
    report: (outcome) => {
      session.print(`✓ ${outcome.summary} : ${outcome.line}${outcome.applied ? ' (fait)' : ''}`);
    },
  });
  if (report.failure !== null) {
    session.print(`✗ ${report.failure.summary}${report.failure.line === '' ? '' : `\n${report.failure.line}`}`);
    if (report.failure.remedy !== null) {
      session.print(report.failure.remedy);
    }
  }
  return report;
}
