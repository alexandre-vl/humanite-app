import { testFixtures } from '@huma/fixtures/vitest';
import { COMMIT_HISTORY_FIXTURES } from './commit-history.ts';

testFixtures('each commit history fixture reports exactly its expected codes', COMMIT_HISTORY_FIXTURES);
