import { defineWorkspaceConfig } from '@huma/eslint-config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = defineWorkspaceConfig({ tsconfigRootDir: import.meta.dirname });

export default config;
