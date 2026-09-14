/**
 * What the agent hooks answer when their own code fails to load or crashes. It imports only the hook protocol, so a
 * broken tool still refuses the calls that touch what the guard protects, lets the others through so that an agent
 * can repair it, and keeps an agent working rather than let it stop on an unverified tree.
 */
import { blockOutput, denyOutput, readHookInput } from '@huma/agents/protocol';

/**
 * Lowercase tokens whose mention refuses a call while the guard is down. Written out rather than imported, so that
 * nothing the guard loads can break it; a test checks it covers every token of the policy.
 */
export const FALLBACK_TOKENS = [
  'docs/adr',
  'adr:decide',
  'adr-decide',
  '--no-veri',
  'hookspath',
  'git_config',
  'git_dir',
  'git_work_tree',
  '--work-tree',
  '--git-dir',
  '-c alias.',
  'config alias.',
  '.git/',
  '.claude/',
  'commit-tree',
  'update-ref',
  'fast-import',
  'git replace',
  'sudo',
  'doas',
  'pkexec',
  'run0',
  'claudecode',
  'ai_agent',
  'claude_code_child_session',
];

const describe = (error: unknown): string => (Error.isError(error) ? error.message : typeof error);

/** `true` when a raw hook input mentions a protected area and must be refused without further analysis. */
export const touchesProtectedArea = (rawInput: string): boolean => {
  const lowered = rawInput.toLowerCase();
  return rawInput.trim() === '' || FALLBACK_TOKENS.some((token) => lowered.includes(token));
};

/** Output of the `PreToolUse` hook when the guard failed: a refusal when the call touches a protected area. */
export const guardFailureOutput = (rawInput: string, error: unknown): string =>
  touchesProtectedArea(rawInput)
    ? denyOutput(
        `Garde des agents en échec (${describe(error)}) : appel refusé par prudence, car il touche une zone protégée.`,
      )
    : '';

/** Output of the `Stop` hook when the checks could not conclude: the agent keeps working, once. */
export const stopFailureOutput = (rawInput: string, error: unknown): string =>
  readHookInput(rawInput)?.stopHookActive === true
    ? ''
    : blockOutput(
        `Hook Stop en échec (${describe(error)}) : pnpm verify n’a pas pu conclure. Corriger l’outillage avant de terminer, ou dire pourquoi c’est impossible.`,
      );
