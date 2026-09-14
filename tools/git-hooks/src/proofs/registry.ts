import { GIT_HOOK_FIXTURES } from './hooks.ts';

/** Every fixture of the git hooks that can prove a rule; bindings point at their ids. */
export const GIT_HOOK_PROOFS = [...GIT_HOOK_FIXTURES] as const;

export type GitHookProofId = (typeof GIT_HOOK_PROOFS)[number]['id'];
