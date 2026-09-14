import { defineWorkspaceConfig } from '@huma/eslint-config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = defineWorkspaceConfig({
  tsconfigRootDir: import.meta.dirname,
  hermesFiles: ['apps/mobile/app/**/*.{ts,tsx}', 'apps/mobile/src/**/*.{ts,tsx}'],
});

export default config;
