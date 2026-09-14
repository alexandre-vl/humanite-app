/**
 * What the agent guard answers when its own code fails to load or crashes. It imports nothing, so a broken tool
 * still refuses the calls that touch what the guard protects, and lets the others through so that an agent can
 * repair it.
 */

const SENSITIVE = [
  'docs/adr',
  'adr:decide',
  'adr-decide',
  '--no-veri',
  'hookspath',
  'git_config',
  '.git/',
  '.claude/',
  'commit-tree',
  'update-ref',
  'sudo',
  'claudecode',
  'ai_agent',
  'claude_code_child_session',
];

export const guardFailureReason = (detail: string): string =>
  `Garde des agents en échec (${detail}) : appel refusé par prudence, car il touche une zone protégée.`;

/** `true` when a raw hook input mentions a protected area and must be refused without further analysis. */
export const touchesProtectedArea = (rawInput: string): boolean => {
  const lowered = rawInput.toLowerCase();
  return rawInput.trim() === '' || SENSITIVE.some((token) => lowered.includes(token));
};

export const denyOutput = (reason: string): string =>
  `${JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  })}\n`;
