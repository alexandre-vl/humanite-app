import { defineNodeConfig } from '@huma/eslint-config';
import type { Linter } from 'eslint';

const config: Linter.Config[] = defineNodeConfig({ tsconfigRootDir: import.meta.dirname });

export default config;
