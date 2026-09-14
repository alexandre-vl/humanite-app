import { posix } from 'node:path';
import { ADR_DIRECTORY, ADR_FILE_NAME } from './spec.ts';

export type GuardDecision = Readonly<{ kind: 'allow' }> | Readonly<{ kind: 'deny'; reason: string }>;

const ALLOW: GuardDecision = { kind: 'allow' };

export const HUMAN_ONLY =
  'Décider d’un ADR (accepted, rejected) revient au décideur humain : il lance pnpm adr:decide dans son propre terminal.';

/** True for `docs/adr/NNNN-slug.md`, relative to the repository root. */
export const isAdrFile = (relativePath: string): boolean =>
  posix.dirname(relativePath) === ADR_DIRECTORY && ADR_FILE_NAME.test(posix.basename(relativePath));

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;
const DECIDED_STATUS_LINE = /^\s*["']?status["']?\s*:\s*["']?(?:accepted|rejected)\b/mu;

/**
 * Whether a text carries a decided status in its front matter, whatever the quoting, spacing, comments or repeated
 * keys: the guard reads more loosely than `adr:check` so that no spelling slips through.
 */
export function carriesDecision(text: string | null): boolean {
  const block = text === null ? undefined : FRONT_MATTER.exec(text)?.[1];
  return block !== undefined && DECIDED_STATUS_LINE.test(block);
}

/** An agent may create and edit proposed ADRs; it may neither write a decided status nor touch a decided ADR. */
export function guardAdrWrite(before: string | null, after: string): GuardDecision {
  if (carriesDecision(before)) {
    return {
      kind: 'deny',
      reason:
        'Cet ADR est décidé, donc figé : pour changer la décision, proposer un nouvel ADR qui le remplace (supersedes).',
    };
  }
  if (carriesDecision(after)) {
    return { kind: 'deny', reason: HUMAN_ONLY };
  }
  return ALLOW;
}

const DECIDE_COMMAND = /\badr:decide\b|tools\/adr\/src\/cli\/decide\.ts/u;

export const guardCommand = (command: string): GuardDecision =>
  DECIDE_COMMAND.test(command) ? { kind: 'deny', reason: HUMAN_ONLY } : ALLOW;

/** Content of the file after an `Edit`, or `null` when `oldString` is absent (the edit fails on its own). */
export function applyEdit(before: string, oldString: string, newString: string, replaceAll: boolean): string | null {
  if (!before.includes(oldString)) {
    return null;
  }
  return replaceAll ? before.split(oldString).join(newString) : before.replace(oldString, () => newString);
}
