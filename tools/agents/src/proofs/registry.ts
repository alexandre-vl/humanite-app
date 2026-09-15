import { AGENT_FIXTURES } from './guard.ts';
import { LOCAL_SETTINGS_FIXTURES } from './local-settings.ts';

/** Every fixture of the agent tooling that can prove a rule; bindings point at their ids. */
export const AGENT_PROOFS = [...AGENT_FIXTURES, ...LOCAL_SETTINGS_FIXTURES] as const;
