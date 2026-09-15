import { expect, test } from 'vitest';
import { POLICY } from '../policy.ts';
import { FALLBACK_TOKENS, FALLBACK_WORDS, touchesProtectedArea } from './fallback.ts';

test('while the guard is down, every token the policy protects still refuses the call', () => {
  for (const token of POLICY.sensitiveTokens) {
    expect(touchesProtectedArea(JSON.stringify({ tool_input: { command: `x ${token} y` } })), token).toBe(true);
  }
  expect([...FALLBACK_TOKENS, ...FALLBACK_WORDS].every((token) => token === token.toLowerCase())).toBe(true);
});

// The short names are looked for as words; a token long enough to be distinctive belongs in the other list.
test('a short name refuses the call only where it stands alone', () => {
  expect(FALLBACK_WORDS.every((word) => word.length <= 2)).toBe(true);
  expect(touchesProtectedArea('{"tool_input":{"command":"su -c id"}}')).toBe(true);
  expect(touchesProtectedArea('{"tool_input":{"command":"grep issue tools"}}')).toBe(false);
});

test('an empty input is refused, an ordinary read is not', () => {
  expect(touchesProtectedArea('  ')).toBe(true);
  expect(touchesProtectedArea('{"tool_input":{"command":"ls tools"}}')).toBe(false);
});
