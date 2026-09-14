import { expect, test } from 'vitest';
import { POLICY } from '../policy.ts';
import { FALLBACK_TOKENS, touchesProtectedArea } from './fallback.ts';

test('while the guard is down, every token the policy protects still refuses the call', () => {
  for (const token of POLICY.sensitiveTokens) {
    expect(touchesProtectedArea(JSON.stringify({ tool_input: { command: `x ${token} y` } })), token).toBe(true);
  }
  expect(FALLBACK_TOKENS.every((token) => token === token.toLowerCase())).toBe(true);
});

test('an empty input is refused, an ordinary read is not', () => {
  expect(touchesProtectedArea('  ')).toBe(true);
  expect(touchesProtectedArea('{"tool_input":{"command":"ls tools"}}')).toBe(false);
});
