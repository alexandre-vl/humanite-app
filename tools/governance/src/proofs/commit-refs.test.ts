import { testFixtures } from '@huma/fixtures/vitest';
import { COMMIT_REFS_FIXTURES } from './commit-refs.ts';

testFixtures('each commit citation fixture reports exactly its expected codes', COMMIT_REFS_FIXTURES);
