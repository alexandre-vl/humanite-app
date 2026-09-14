import { expect, test } from 'vitest';
import { agentSessionMarkers } from './session.ts';

test('agentSessionMarkers lists the agent variables set to a non-empty value', () => {
  expect(agentSessionMarkers({})).toEqual([]);
  expect(agentSessionMarkers({ CLAUDECODE: '1', AI_AGENT: '', CLAUDE_CODE_CHILD_SESSION: '1' })).toEqual([
    'CLAUDECODE',
    'CLAUDE_CODE_CHILD_SESSION',
  ]);
});
