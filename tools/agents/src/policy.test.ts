import { expect, test } from 'vitest';
import { coversPath, pathPermission } from './policy.ts';
import { FIXTURE_POLICY } from './proofs/guard.ts';
import { readCommands } from './shell/commands.ts';

test('every permission entry of a command rule names a command that rule refuses', () => {
  for (const rule of FIXTURE_POLICY.commands) {
    for (const entry of rule.permissions) {
      const line = /^Bash\((?<line>.*)\)$/u
        .exec(entry)
        ?.groups?.['line']?.replace(/\s?\*$/u, (star) => (star === '*' ? '' : ' x'));
      expect(line, entry).toBeDefined();
      expect(readCommands(line ?? '', { home: null }).some(rule.matches), entry).toBe(true);
    }
  }
});

test('every path permission designates the files its rule protects', () => {
  for (const rule of FIXTURE_POLICY.paths) {
    const permission = pathPermission(rule);
    const sample = permission
      .replace(/^Edit\(\//u, '')
      .replace(/\)$/u, '')
      .replace('**', 'hooks/pre-commit');
    expect(coversPath(rule, sample), permission).toBe(true);
  }
});

test('code tools are refused on the tokens of every protected path and human-only command', () => {
  expect(FIXTURE_POLICY.sensitiveTokens).toEqual(
    expect.arrayContaining(['adr:decide', 'adr-decide.ts', '.git/', '.claude/settings.local.json']),
  );
  expect(FIXTURE_POLICY.sensitiveTokens.every((token) => token === token.toLowerCase())).toBe(true);
});
