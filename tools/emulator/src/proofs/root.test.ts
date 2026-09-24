import { existsSync } from 'node:fs';
import type { Coverage } from '@huma/fixtures';
import { testFixtures } from '@huma/fixtures/vitest';
import { expectTypeOf, test } from 'vitest';
import type { GuardCode } from '../checks.ts';
import { ROOT_FIXTURES } from './root.ts';

// The root guard runs on the emulator's Linux host: its records read `/proc` and mount tables, and modes the way GNU
// stat gives them (ADR-0010). Off Linux those read nothing, so these fixtures are skipped here and run on the server.
const OFF_LINUX = !existsSync('/proc');

test('every code of the root guard is reached by a fixture', () => {
  expectTypeOf<Coverage<GuardCode, typeof ROOT_FIXTURES>>().toEqualTypeOf<true>();
});

testFixtures('each root guard fixture reports exactly its expected codes', ROOT_FIXTURES, { skipIf: OFF_LINUX });
